import AsyncStorage from '@react-native-async-storage/async-storage';
import { ledgerDB, cardsDB } from '../database/db';
import { getDueCardsCount } from '../fsrs/scheduler';
import { calculateLexPerCard } from '../logic/lexCalculator';
import type { Card, Book } from '../types';

const LAST_ROLLOVER_KEY = 'lastRolloverDate';

export async function getLastRolloverDate(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LAST_ROLLOVER_KEY);
  } catch (error) {
    console.error('Failed to get last rollover date:', error);
    return null;
  }
}

export async function setLastRolloverDate(date: string): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_ROLLOVER_KEY, date);
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
  cards: Card[],
  books: Book[],
  currentBalance: number
): Promise<{ success: boolean; newBalance: number; targetLex: number }> {
  try {
    const today = new Date().toISOString().split('T')[0];

    const dueCount = getDueCardsCount(cards);
    // 書籍が複数モードなら平均 (単純化): モード別平均Lexを weighted by dueCount per bookは後で改善
    const modeCounts: Record<0|1|2, number> = { 0: 0, 1: 0, 2: 0 };
    for (const c of cards) {
      const b = books.find(bk => bk.id === c.bookId);
      if (b) modeCounts[b.mode] = (modeCounts[b.mode] || 0) + 1;
    }
    let targetLex = 0;
    (Object.keys(modeCounts) as string[]).forEach(k => {
      const m = parseInt(k, 10) as 0 | 1 | 2;
      if (modeCounts[m] > 0) targetLex += modeCounts[m] * calculateLexPerCard(m);
    });

    const newBalance = currentBalance - targetLex;

    await ledgerDB.upsert({
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
  cards: Card[],
  books: Book[],
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

  const result = await performDailyRollover(cards, books, currentBalance);

  return {
    performed: result.success,
    newBalance: result.newBalance,
    targetLex: result.targetLex,
  };
}
