import type { ILedgerRepository } from '../repository/LedgerRepository';
import { getTodayUnixMidnight } from './dateUtils';

/**
 * 連続学習日数（ストリーク）を計算
 * 
 * パフォーマンス改善:
 * - ✅ SQL再帰CTE版を優先使用
 * - ✅ フォールバック: JavaScript版（後方互換性）
 * 
 * レビュー指摘: "SQLiteのWindow Functions (LEAD/LAG)や再帰CTEを使えば、SQL一発でストリーク日数を算出できます"
 * → Repository層にSQL実装を追加し、こちらから呼び出すように変更
 * 
 * @returns 現在のストリーク日数（今日含む）
 */
export async function calculateCurrentStreak(ledgerRepo: ILedgerRepository): Promise<number> {
  try {
    // ✅ SQL最適化版を使用（Repository層で再帰CTE実装）
    return await ledgerRepo.calculateCurrentStreakSQL();
  } catch (error) {
    console.error('[streakCalculator] Failed to calculate streak:', error);
    return 0;
  }
}

/**
 * 最長ストリーク記録を計算
 * - 過去の全履歴から最長の連続学習日数を返す
 * - SQL最適化: 必要な日付のみ取得
 */
export async function calculateMaxStreak(ledgerRepo: ILedgerRepository): Promise<number> {
  try {
    
    // SQL最適化: earned_lex > 0 の日付のみ昇順で取得
    const activeDaysUnix = await ledgerRepo.findActiveDaysDescending();
    activeDaysUnix.reverse(); // 古い順にソート

    if (activeDaysUnix.length === 0) {
      return 0;
    }

    let maxStreak = 1;
    let currentStreak = 1;
    const oneDaySeconds = 60 * 60 * 24;

    for (let i = 1; i < activeDaysUnix.length; i++) {
      const diffSeconds = activeDaysUnix[i] - activeDaysUnix[i - 1];

      if (diffSeconds === oneDaySeconds) {
        // 連続している
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        // 途切れた
        currentStreak = 1;
      }
    }

    return maxStreak;
  } catch (error) {
    console.error('Failed to calculate max streak:', error);
    return 0;
  }
}
