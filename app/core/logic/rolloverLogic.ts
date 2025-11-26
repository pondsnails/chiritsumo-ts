import { ledgerDB } from '../database/db';
import { getTodayDateString, getYesterdayDateString } from '../utils/dateUtils';

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

    const baseTarget = 100;
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

    console.log('Daily rollover completed', {
      yesterday: yesterdayEntry,
      newBalance,
      adjustedTarget,
    });
  } catch (error) {
    console.error('Failed to perform daily rollover:', error);
  }
}

export function shouldPerformRollover(lastRolloverDate: string | null): boolean {
  if (!lastRolloverDate) return true;

  const today = getTodayDateString();
  return lastRolloverDate !== today;
}
