import type { ILedgerRepository } from '../repository/LedgerRepository';
import type { ISystemSettingsRepository } from '../repository/SystemSettingsRepository';
import type { ICardRepository } from '../repository/CardRepository';
import { calculateLexPerCard } from '../logic/lexCalculator';
import { getTodayDateString } from './dateUtils';
import { logError, ErrorCategory, safeExecute } from './errorHandler';

const LAST_ROLLOVER_KEY = 'lastRolloverDate';

export async function getLastRolloverDate(settingsRepo: ISystemSettingsRepository): Promise<string | null> {
  return safeExecute(
    () => settingsRepo.get(LAST_ROLLOVER_KEY),
    {
      category: ErrorCategory.DATABASE,
      operationName: 'getLastRolloverDate',
      fallbackValue: null,
    }
  );
}

export async function setLastRolloverDate(settingsRepo: ISystemSettingsRepository, date: string): Promise<void> {
  try {
    await settingsRepo.set(LAST_ROLLOVER_KEY, date);
  } catch (error) {
    logError(error, {
      category: ErrorCategory.DATABASE,
      operation: 'setLastRolloverDate',
      metadata: { date },
    });
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
  cardRepo: ICardRepository,
  ledgerRepo: ILedgerRepository,
  settingsRepo: ISystemSettingsRepository,
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

    await ledgerRepo.upsert({
      date: Math.floor(new Date(today).getTime() / 1000),
      earnedLex: 0,
      targetLex,
      balance: newBalance,
    });

    await setLastRolloverDate(settingsRepo, today);

    return {
      success: true,
      newBalance,
      targetLex,
    };
  } catch (error) {
    logError(error, {
      category: ErrorCategory.DATABASE,
      operation: 'performDailyRollover',
      metadata: { currentBalance },
    });
    return {
      success: false,
      newBalance: currentBalance,
      targetLex: 0,
    };
  }
}

export async function checkAndPerformRollover(
  cardRepo: ICardRepository,
  ledgerRepo: ILedgerRepository,
  settingsRepo: ISystemSettingsRepository,
  currentBalance: number
): Promise<{ performed: boolean; newBalance: number; targetLex: number }> {
  const lastRollover = await getLastRolloverDate(settingsRepo);

  if (!shouldPerformRollover(lastRollover)) {
    return {
      performed: false,
      newBalance: currentBalance,
      targetLex: 0,
    };
  }

  const result = await performDailyRollover(cardRepo, ledgerRepo, settingsRepo, currentBalance);
  return {
    performed: result.success,
    newBalance: result.newBalance,
    targetLex: result.targetLex,
  };
}
