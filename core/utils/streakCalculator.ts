import { DrizzleLedgerRepository } from '../repository/LedgerRepository';
import { getTodayUnixMidnight } from './dateUtils';

/**
 * 連続学習日数（ストリーク）を計算
 * - ledgerテーブルのdate履歴から、今日まで連続して学習記録がある日数を返す
 * - earned_lex > 0 の日のみカウント（目標設定だけでは不可）
 * - SQL最適化: 全件取得せず、必要な範囲のみ取得
 * 
 * @returns 現在のストリーク日数（今日含む）
 */
export async function calculateCurrentStreak(): Promise<number> {
  try {
    const ledgerRepo = new DrizzleLedgerRepository();
    
    // SQL最適化: earned_lex > 0 の日付のみ降順で取得（最大365日分を見る）
    const activeDaysUnix = await ledgerRepo.findActiveDaysDescending(365);

    if (activeDaysUnix.length === 0) {
      return 0;
    }

    // 今日の0時（Unix秒）
    const todayUnix = getTodayUnixMidnight();
    
    // 最新の学習日が今日でない場合、ストリークは途切れている
    if (activeDaysUnix[0] !== todayUnix) {
      return 0;
    }

    let streak = 1; // 今日をカウント
    const oneDaySeconds = 60 * 60 * 24;
    let expectedUnix = todayUnix - oneDaySeconds; // 昨日

    // 昨日から遡って連続日数をカウント
    for (let i = 1; i < activeDaysUnix.length; i++) {
      if (activeDaysUnix[i] === expectedUnix) {
        streak++;
        expectedUnix -= oneDaySeconds;
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
 * - SQL最適化: 必要な日付のみ取得
 */
export async function calculateMaxStreak(): Promise<number> {
  try {
    const ledgerRepo = new DrizzleLedgerRepository();
    
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
