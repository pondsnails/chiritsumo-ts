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

    const dueCards = cards.filter(card => {
      const dueDate = typeof card.due === 'string' ? new Date(card.due) : card.due;
      return dueDate <= new Date();
    });

    let totalTargetLex = 0;
    for (const card of dueCards) {
      const book = books.find(b => b.id === card.bookId);
      if (book) {
        totalTargetLex += calculateLexPerCard(book.mode);
      }
    }

    const newBalance = currentBalance - totalTargetLex;

    await ledgerDB.add({
      date: new Date().toISOString(),
      targetLex: totalTargetLex,
      earnedLex: 0,
      balance: newBalance,
    });

    await setLastRolloverDate(today);

    return {
      success: true,
      newBalance,
      targetLex: totalTargetLex,
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
