import AsyncStorage from '@react-native-async-storage/async-storage';
import { ledgerDB, cardsDB } from '../database/db';
import { calculateLexPerCard } from '../logic/lexCalculator';
import type { Card, Book } from '../types';

const LAST_ROLLOVER_KEY = 'lastRolloverDate';

// Default Lex per card value used when no books exist
const DEFAULT_LEX_PER_CARD = 30;

/**
 * Calculate average Lex per card across all books
 */
function getAverageLexPerCard(books: Book[]): number {
  if (books.length === 0) return DEFAULT_LEX_PER_CARD;
  
  const totalLex = books.reduce((sum, book) => {
    return sum + calculateLexPerCard(book.mode);
  }, 0);
  
  return Math.floor(totalLex / books.length);
}

/**
 * Count due cards (cards that are due today or earlier)
 */
function getDueCardsCount(cards: Card[]): number {
  const now = new Date();
  return cards.filter(c => c.due <= now).length;
}

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
    const lexPerCard = getAverageLexPerCard(books);
    const targetLex = dueCount * lexPerCard;

    const newBalance = currentBalance - targetLex;

    await ledgerDB.add({
      id: Date.now() + Math.floor(Math.random() * 1000),
      date: new Date().toISOString(),
      targetLex,
      earnedLex: 0,
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
