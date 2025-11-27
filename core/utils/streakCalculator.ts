import { DrizzleLedgerRepository } from '../repository/LedgerRepository';

/**
 * 連続学習日数（ストリーク）を計算
 * - ledgerテーブルのdate履歴から、今日まで連続して学習記録がある日数を返す
 * - earned_lex > 0 の日のみカウント（目標設定だけでは不可）
 * 
 * @returns 現在のストリーク日数（今日含む）
 */
export async function calculateCurrentStreak(): Promise<number> {
  try {
    const ledgerRepo = new DrizzleLedgerRepository();
    const allEntries = await ledgerRepo.findAll();
    
    // earned_lex > 0 のエントリのみフィルタ（実績がある日のみ）
    const activeDays = allEntries
      .filter(entry => entry.earnedLex > 0)
      .map(entry => entry.date)
      .sort()
      .reverse(); // 新しい順にソート

    if (activeDays.length === 0) {
      return 0;
    }

    // 今日の日付（YYYY-MM-DD形式）
    const today = new Date().toISOString().split('T')[0];
    
    // 最新の学習日が今日でない場合、ストリークは途切れている
    if (activeDays[0] !== today) {
      return 0;
    }

    let streak = 1; // 今日をカウント
    let expectedDate = new Date(today);

    // 昨日から遡って連続日数をカウント
    for (let i = 1; i < activeDays.length; i++) {
      expectedDate.setDate(expectedDate.getDate() - 1);
      const expectedDateStr = expectedDate.toISOString().split('T')[0];

      if (activeDays[i] === expectedDateStr) {
        streak++;
      } else {
        // 連続が途切れた
        break;
      }
    }

    return streak;
  } catch (error) {
    console.error('Failed to calculate streak:', error);
    return 0;
  }
}

/**
 * 最長ストリーク記録を計算
 * - 過去の全履歴から最長の連続学習日数を返す
 */
export async function calculateMaxStreak(): Promise<number> {
  try {
    const ledgerRepo = new DrizzleLedgerRepository();
    const allEntries = await ledgerRepo.findAll();
    
    const activeDays = allEntries
      .filter(entry => entry.earnedLex > 0)
      .map(entry => entry.date)
      .sort(); // 古い順にソート

    if (activeDays.length === 0) {
      return 0;
    }

    let maxStreak = 1;
    let currentStreak = 1;

    for (let i = 1; i < activeDays.length; i++) {
      const prevDate = new Date(activeDays[i - 1]);
      const currDate = new Date(activeDays[i]);
      
      // 日付差分を計算（ミリ秒 → 日）
      const diffDays = Math.floor(
        (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays === 1) {
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
