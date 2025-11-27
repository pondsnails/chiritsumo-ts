/**
 * Velocity(学習速度)ベースの動的目標設定システム
 * 
 * アーキテクチャ改善:
 * - JSON文字列保存 → velocity_measurementsテーブルに正規化
 * - SQL集計で平均速度を計算（メモリに全データを展開しない）
 * - バックアップ・復元の信頼性向上
 * 
 * データ永続化:
 * - velocity_measurements テーブル: 日次の学習データ
 * - system_settings テーブル: ユーザー設定（希望学習時間など）
 */

import { DrizzleVelocityMeasurementRepository } from '../repository/VelocityMeasurementRepository';
import { DrizzleSystemSettingsRepository } from '../repository/SystemSettingsRepository';
import { getTodayUnixMidnight } from '@core/utils/dateEpochUtils';
import { reportError } from './errorReporter';
import { VelocityMeasurement } from '../database/schema';

export interface VelocityStats {
  avgVelocity: number;
  totalMeasurements: number;
}

const VELOCITY_SETTINGS_KEY = 'velocity_settings';
const MEASUREMENT_PERIOD_DAYS = 3;

const velocityRepo = new DrizzleVelocityMeasurementRepository();
const settingsRepo = new DrizzleSystemSettingsRepository();

export interface VelocitySettings {
  desiredDailyMinutes: number | null; // ユーザーが希望する1日の学習時間（分）
  autoAdjustEnabled: boolean; // 自動調整（Pro版限定）
  calculatedTarget: number | null; // 自動算出された目標Lex
}

export interface VelocityData {
  measurementCompleted: boolean;
  averageVelocity: number | null;
  measurements: VelocityMeasurement[];
}

export async function getVelocityData(): Promise<VelocityData> {
  const completed = await isMeasurementCompleted();
  const avg = await getAverageVelocity();
  const measurements = await getRecentMeasurements();
  return {
    measurementCompleted: completed,
    averageVelocity: avg,
    measurements,
  };
}

/**
 * 今日の学習データを記録
 */
export async function recordDailyVelocity(
  lexEarned: number,
  minutesSpent: number
): Promise<void> {
  try {
    const today = getTodayUnixMidnight();
    await velocityRepo.upsert({
      date: today,
      earned_lex: lexEarned,
      minutes_spent: minutesSpent,
    });
    const cutoffEpoch = getTodayUnixMidnight() - (MEASUREMENT_PERIOD_DAYS * 24 * 60 * 60);
    await velocityRepo.deleteOlderThan(cutoffEpoch);
  } catch (error) {
    reportError(error, { context: 'recordDailyVelocity' });
  }
}

/**
 * 平均学習速度を取得（Lex/分）
 */
export async function getAverageVelocity(): Promise<number | null> {
  try {
    const stats = await velocityRepo.getAverageVelocity(MEASUREMENT_PERIOD_DAYS);
    
    if (!stats || stats.totalMeasurements < MEASUREMENT_PERIOD_DAYS) {
      return null; // 計測期間不足
    }

    return stats.avgVelocity;
  } catch (error) {
    reportError(error, { context: 'getAverageVelocity' });
    return null;
  }
}

/**
 * 計測が完了しているかチェック
 */
export async function isMeasurementCompleted(): Promise<boolean> {
  try {
    const recentMeasurements = await velocityRepo.findRecent(MEASUREMENT_PERIOD_DAYS);
    return recentMeasurements.length >= MEASUREMENT_PERIOD_DAYS;
  } catch (error) {
    reportError(error, { context: 'isMeasurementCompleted' });
    return false;
  }
}

/**
 * 最近の計測データを取得
 */
export async function getRecentMeasurements(days: number = MEASUREMENT_PERIOD_DAYS) {
  try {
    return await velocityRepo.findRecent(days);
  } catch (error) {
    reportError(error, { context: 'getRecentMeasurements' });
    return [];
  }
}

/**
 * Velocity設定を取得
 */
export async function getVelocitySettings(): Promise<VelocitySettings> {
  try {
    const json = await settingsRepo.get(VELOCITY_SETTINGS_KEY);
    if (json) {
      return JSON.parse(json);
    }
  } catch (error) {
    reportError(error, { context: 'getVelocitySettings' });
  }

  return {
    desiredDailyMinutes: null,
    autoAdjustEnabled: false,
    calculatedTarget: null,
  };
}

/**
 * 希望学習時間を設定して目標を自動算出
 */
export async function setDesiredDailyMinutes(minutes: number): Promise<number> {
  try {
    const avgVelocity = await getAverageVelocity();
    
    if (!avgVelocity) {
      throw new Error('Velocity measurement not completed');
    }

    const calculatedTarget = Math.floor(avgVelocity * minutes);
    
    const settings: VelocitySettings = {
      desiredDailyMinutes: minutes,
      autoAdjustEnabled: false,
      calculatedTarget,
    };

    await settingsRepo.set(VELOCITY_SETTINGS_KEY, JSON.stringify(settings));
    return calculatedTarget;
  } catch (error) {
    reportError(error, { context: 'setDesiredDailyMinutes' });
    throw error;
  }
}

/**
 * 自動調整を有効化(Pro版限定)
 */
export async function enableAutoAdjust(): Promise<void> {
  try {
    const settings = await getVelocitySettings();
    settings.autoAdjustEnabled = true;
    await settingsRepo.set(VELOCITY_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    reportError(error, { context: 'enableAutoAdjust' });
  }
}

/**
 * 達成率に基づいて目標を自動調整（Pro版限定）
 * - 7日連続で達成率100%以上: +10%
 * - 7日連続で達成率50%未満: -15%
 */
export async function adjustTargetBasedOnPerformance(
  recentAchievementRates: number[] // 直近7日分の達成率
): Promise<number | null> {
  try {
    const settings = await getVelocitySettings();
    
    if (!settings.autoAdjustEnabled || !settings.calculatedTarget) {
      return null;
    }

    if (recentAchievementRates.length < 7) {
      return null; // データ不足
    }

    const allAbove100 = recentAchievementRates.every(rate => rate >= 100);
    const allBelow50 = recentAchievementRates.every(rate => rate < 50);

    let newTarget = settings.calculatedTarget;

    if (allAbove100) {
      newTarget = Math.floor(settings.calculatedTarget * 1.1);
    } else if (allBelow50) {
      newTarget = Math.floor(settings.calculatedTarget * 0.85);
    } else {
      return null; // 調整不要
    }

    settings.calculatedTarget = newTarget;
    await settingsRepo.set(VELOCITY_SETTINGS_KEY, JSON.stringify(settings));
    
    return newTarget;
  } catch (error) {
    reportError(error, { context: 'adjustTargetBasedOnPerformance' });
    return null;
  }
}

/**
 * 計測データをリセット(新規ユーザーや再測定時)
 */
export async function resetVelocityMeasurement(): Promise<void> {
  try {
    // velocity_measurementsテーブルの全データを削除
    // Use very large future epoch (approx year 3000)
    const farFutureEpoch = getTodayUnixMidnight() + (365 * 24 * 60 * 60 * 1000);
    await velocityRepo.deleteOlderThan(farFutureEpoch);
    
    // 設定もリセット
    await settingsRepo.delete(VELOCITY_SETTINGS_KEY);
  } catch (error) {
    reportError(error, { context: 'resetVelocityMeasurement' });
  }
}


