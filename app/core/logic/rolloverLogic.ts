import { ledgerDB, cardsDB } from '../database/db';
import { getTodayDateString, getYesterdayDateString } from '../utils/dateUtils';
import { getDailyLexTarget } from '../services/lexSettingsService';
import { calculateLexPerCard } from './lexCalculator';

/**
 * 新規カードを割り当てる数を計算
 * @param targetLex 今日のLex目標
 * @param dueLex 復習で獲得できるLex
 * @param avgLexPerCard 1カードあたりの平均Lex
 * @returns 割り当てる新規カード数
 */
function calculateNewCardsToAssign(
  targetLex: number,
  dueLex: number,
  avgLexPerCard: number
): number {
  const remainingLex = targetLex - dueLex;
  
  if (remainingLex <= 0) {
    // 復習だけで目標達成できる場合は新規カードなし
    return 0;
  }
  
  // 不足分を新規カードで埋める
  const newCards = Math.ceil(remainingLex / avgLexPerCard);
  
  // 最小1枚、最大50枚
  return Math.max(1, Math.min(newCards, 50));
}

export async function performDailyRollover(): Promise<void> {
  try {
    const today = getTodayDateString();
    const yesterday = getYesterdayDateString();

    const ledgerEntries = await ledgerDB.getRecent(2);
    const yesterdayEntry = ledgerEntries.find((e) => e.date === yesterday);
    const todayEntry = ledgerEntries.find((e) => e.date === today);

    if (!yesterdayEntry) {
      console.log('No yesterday entry found, skipping rollover');
      return;
    }

    const deficit = yesterdayEntry.targetLex - yesterdayEntry.earnedLex;
    const newBalance = yesterdayEntry.balance + deficit;

    // ユーザーのLex目標設定を取得
    const baseTarget = await getDailyLexTarget();
    const adjustedTarget = deficit > 0 ? baseTarget + Math.abs(deficit) : baseTarget;

    if (todayEntry) {
      await ledgerDB.upsert({
        date: today,
        earnedLex: todayEntry.earnedLex,
        targetLex: adjustedTarget,
        balance: newBalance,
      });
    } else {
      await ledgerDB.upsert({
        date: today,
        earnedLex: 0,
        targetLex: adjustedTarget,
        balance: newBalance,
      });
    }

    // 新規カードの割り当て
    await assignNewCards(adjustedTarget);

    console.log('Daily rollover completed', {
      yesterday: yesterdayEntry,
      newBalance,
      adjustedTarget,
    });
  } catch (error) {
    console.error('Failed to perform daily rollover:', error);
  }
}

/**
 * 新規カードを割り当て（due日を今日に設定）
 */
async function assignNewCards(targetLex: number): Promise<void> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // 今日期限の復習カードを取得
    const dueCards = await cardsDB.getDueCards(today.toISOString());
    
    // 復習カードで獲得できるLexを計算（簡易的に平均値を使用）
    const avgLexPerCard = 15; // Read: 10, Solve: 20, Memo: 15の平均
    const dueLex = dueCards.length * avgLexPerCard;
    
    // 新規カード割り当て数を計算
    const newCardsNeeded = calculateNewCardsToAssign(targetLex, dueLex, avgLexPerCard);
    
    if (newCardsNeeded === 0) {
      console.log('No new cards needed today (reviews cover target)');
      return;
    }
    
    // state=0 (new) のカードを取得（優先度順、Book作成順）
    const newCards = await cardsDB.getNewCards(newCardsNeeded);
    
    // 新規カードのdue日を今日に設定
    for (const card of newCards) {
      await cardsDB.update(card.id, {
        ...card,
        due: today,
      });
    }
    
    console.log(`Assigned ${newCards.length} new cards for today (target: ${newCardsNeeded})`);
  } catch (error) {
    console.error('Failed to assign new cards:', error);
  }
}

export function shouldPerformRollover(lastRolloverDate: string | null): boolean {
  if (!lastRolloverDate) return true;

  const today = getTodayDateString();
  return lastRolloverDate !== today;
}
