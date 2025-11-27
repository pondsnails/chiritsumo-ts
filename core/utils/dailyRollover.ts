import { DrizzleLedgerRepository } from '../repository/LedgerRepository';
import { DrizzleSystemSettingsRepository } from '../repository/SystemSettingsRepository';
import { DrizzleCardRepository } from '../repository/CardRepository';
import { calculateLexPerCard } from '../logic/lexCalculator';
import { getTodayDateString } from './dateUtils';

const LAST_ROLLOVER_KEY = 'lastRolloverDate';
const settingsRepo = new DrizzleSystemSettingsRepository();
const cardRepo = new DrizzleCardRepository();

export async function getLastRolloverDate(): Promise<string | null> {
  try {
    return await settingsRepo.get(LAST_ROLLOVER_KEY);
  } catch (error) {
    console.error('Failed to get last rollover date:', error);
    return null;
  }
}

export async function setLastRolloverDate(date: string): Promise<void> {
  try {
    await settingsRepo.set(LAST_ROLLOVER_KEY, date);
  } catch (error) {
    console.error('Failed to set last rollover date:', error);
  }
}

export function shouldPerformRollover(lastRolloverDate: string | null): boolean {
  if (!lastRolloverDate) return true;

  const last = new Date(lastRolloverDate);
  const now = new Date();

  return (
    now.getFullYear() !== last.getFullYear() ||
    now.getMonth() !== last.getMonth() ||
    now.getDate() !== last.getDate()
  );
}

export async function performDailyRollover(
  currentBalance: number
): Promise<{ success: boolean; newBalance: number; targetLex: number }> {
  try {
    const today = getTodayDateString();

    // DBから直接モード別のカード数を取得（全件ロード回避）
    const modeCountsList = await cardRepo.getCardCountsByBookMode();
    const modeCounts: Record<0|1|2, number> = { 0: 0, 1: 0, 2: 0 };
    
    for (const item of modeCountsList) {
      modeCounts[item.mode] = item.count;
    }

    let targetLex = 0;
    (Object.keys(modeCounts) as string[]).forEach(k => {
      const m = parseInt(k, 10) as 0 | 1 | 2;
      if (modeCounts[m] > 0) targetLex += modeCounts[m] * calculateLexPerCard(m);
    });

    const newBalance = currentBalance - targetLex;

    const ledgerRepo = new DrizzleLedgerRepository();
    await ledgerRepo.upsert({
      date: today,
      earnedLex: 0,
      targetLex,
      balance: newBalance,
    });

    await setLastRolloverDate(today);

    return {
      success: true,
      newBalance,
      targetLex,
    };
  } catch (error) {
    console.error('Failed to perform daily rollover:', error);
    return {
      success: false,
      newBalance: currentBalance,
      targetLex: 0,
    };
  }
}

export async function checkAndPerformRollover(
  currentBalance: number
): Promise<{ performed: boolean; newBalance: number; targetLex: number }> {
  const lastRollover = await getLastRolloverDate();

  if (!shouldPerformRollover(lastRollover)) {
    return {
      performed: false,
      newBalance: currentBalance,
      targetLex: 0,
    };
  }

  const result = await performDailyRollover(currentBalance);
  return {
    performed: result.success,
    newBalance: result.newBalance,
    targetLex: result.targetLex,
  };
}
