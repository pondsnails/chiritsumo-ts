/**
 * Velocity(学習速度)ベースの動的目標設定システム
 * 
 * 問題点:
 * - 固定のLexプロファイル(100, 200, 400...)では、ユーザーの実際の学習速度を無視している
 * - 「200 Lex」が何分かかるのか、初見ユーザーには全く分からない
 * 
 * 解決策:
 * - 最初の3日間は計測のみ行い、ユーザーの「Lex/分」を算出
 * - 「1日何分勉強したいか」を聞き、それに基づいて目標を自動算出
 * - 達成率に応じて目標を自動調整(Pro版限定)
 * 
 * データ永続化:
 * - SQLite (system_settings テーブル) に保存
 * - AsyncStorage依存を排除し、バックアップに含まれるように修正
 */

import { DrizzleSystemSettingsRepository } from '../repository/SystemSettingsRepository';
import { getTodayDateString } from '../utils/dateUtils';

const VELOCITY_DATA_KEY = 'velocity_measurement_data';
const VELOCITY_SETTINGS_KEY = 'velocity_settings';
const MEASUREMENT_PERIOD_DAYS = 3;

const settingsRepo = new DrizzleSystemSettingsRepository();

export interface VelocityMeasurement {
  date: string; // ISO date string
  totalLexEarned: number;
  totalMinutesSpent: number; // 実際の学習時間（分）
}

export interface VelocityData {
  measurements: VelocityMeasurement[];
  averageVelocity: number | null; // Lex/分（計測完了後に算出）
  measurementCompleted: boolean;
}

export interface VelocitySettings {
  desiredDailyMinutes: number | null; // ユーザーが希望する1日の学習時間（分）
  autoAdjustEnabled: boolean; // 自動調整（Pro版限定）
  calculatedTarget: number | null; // 自動算出された目標Lex
}

/**
 * 今日の学習データを記録
 */
export async function recordDailyVelocity(
  lexEarned: number,
  minutesSpent: number
): Promise<void> {
  try {
    const data = await getVelocityData();
    const today = new Date().toISOString().split('T')[0];

    // 既存の今日のデータがあれば更新、なければ追加
    const existingIndex = data.measurements.findIndex(m => m.date === today);
    const newMeasurement: VelocityMeasurement = {
      date: today,
      totalLexEarned: lexEarned,
      totalMinutesSpent: minutesSpent,
    };

    if (existingIndex >= 0) {
      data.measurements[existingIndex] = newMeasurement;
    } else {
      data.measurements.push(newMeasurement);
    }

    // 最新3日分のみ保持
    data.measurements = data.measurements.slice(-MEASUREMENT_PERIOD_DAYS);

    // 3日分データが揃ったら平均Velocityを算出
    if (data.measurements.length >= MEASUREMENT_PERIOD_DAYS) {
      const totalLex = data.measurements.reduce((sum, m) => sum + m.totalLexEarned, 0);
      const totalMinutes = data.measurements.reduce((sum, m) => sum + m.totalMinutesSpent, 0);
      
      if (totalMinutes > 0) {
        data.averageVelocity = totalLex / totalMinutes;
        data.measurementCompleted = true;
      }
    }

    await settingsRepo.set(VELOCITY_DATA_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to record velocity:', error);
  }
}

/**
 * Velocity計測データを取得
 */
export async function getVelocityData(): Promise<VelocityData> {
  try {
    const json = await settingsRepo.get(VELOCITY_DATA_KEY);
    if (json) {
      return JSON.parse(json);
    }
  } catch (error) {
    console.error('Failed to get velocity data:', error);
  }

  return {
    measurements: [],
    averageVelocity: null,
    measurementCompleted: false,
  };
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
    console.error('Failed to get velocity settings:', error);
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
    const data = await getVelocityData();
    
    if (!data.averageVelocity) {
      throw new Error('Velocity measurement not completed');
    }

    const calculatedTarget = Math.floor(data.averageVelocity * minutes);
    
    const settings: VelocitySettings = {
      desiredDailyMinutes: minutes,
      autoAdjustEnabled: false,
      calculatedTarget,
    };

    await settingsRepo.set(VELOCITY_SETTINGS_KEY, JSON.stringify(settings));
    return calculatedTarget;
  } catch (error) {
    console.error('Failed to set desired daily minutes:', error);
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
    console.error('Failed to enable auto adjust:', error);
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
    console.error('Failed to adjust target:', error);
    return null;
  }
}

/**
 * 計測データをリセット(新規ユーザーや再測定時)
 */
export async function resetVelocityMeasurement(): Promise<void> {
  try {
    await settingsRepo.delete(VELOCITY_DATA_KEY);
    await settingsRepo.delete(VELOCITY_SETTINGS_KEY);
  } catch (error) {
    console.error('Failed to reset velocity measurement:', error);
  }
}
