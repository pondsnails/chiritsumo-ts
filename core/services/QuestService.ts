/**
 * QuestService
 * クエスト画面のビジネスロジックを純粋関数として提供
 * useQuestDataから分離して、テスト可能にする
 */

import type { Card, Book } from '@core/types';
import { calculateLexPerCard } from '@core/logic/lexCalculator';

/**
 * カードリストから総Lex数を計算
 */
export function calculateTotalLex(cards: Card[], books: Book[]): number {
  const modeMap = new Map(books.map(b => [b.id, b.mode]));
  return cards.reduce((sum, card) => {
    const mode = modeMap.get(card.bookId) || 0;
    return sum + calculateLexPerCard(mode);
  }, 0);
}

/**
 * カードを書籍別にグループ化
 */
export function groupCardsByBook(
  cards: Card[], 
  books: Book[]
): Array<{ book: Book; cards: Card[] }> {
  const bookMap = new Map(books.map(b => [b.id, b]));
  const grouped = new Map<string, { book: Book; cards: Card[] }>();
  
  cards.forEach(card => {
    const book = bookMap.get(card.bookId);
    if (!book) return;
    
    if (!grouped.has(card.bookId)) {
      grouped.set(card.bookId, { book, cards: [] });
    }
    grouped.get(card.bookId)!.cards.push(card);
  });
  
  return Array.from(grouped.values());
}

/**
 * 次に復習すべきカードを取得（期限が最も古いもの）
 */
export function getGlobalNextCard(dueCards: Card[]): Card | null {
  if (dueCards.length === 0) return null;
  
  const now = new Date();
  const filtered = dueCards.filter(c => c.due <= now);
  
  if (filtered.length === 0) return null;
  
  return filtered.sort((a, b) => a.due.getTime() - b.due.getTime())[0];
}

/**
 * カードが所属する書籍を取得
 */
export function getCardBook(card: Card | null, books: Book[]): Book | null {
  if (!card) return null;
  return books.find(b => b.id === card.bookId) || null;
}

/**
 * 今日の新規カードをフィルタリング
 */
export function filterTodayNewCards(allNewCards: Card[], bookIds: string[]): Card[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return allNewCards.filter(card => {
    const cardDate = new Date(card.due);
    cardDate.setHours(0, 0, 0, 0);
    return cardDate.getTime() === today.getTime() && bookIds.includes(card.bookId);
  });
}

/**
 * プリセットまたはアクティブな書籍から対象書籍IDを解決
 */
export function resolveTargetBookIds(
  activePresetId: number | null,
  presets: Array<{ id: number; bookIds: string[] }>,
  books: Book[]
): string[] {
  let ids: string[];
  
  if (activePresetId) {
    const preset = presets.find(p => p.id === activePresetId);
    ids = preset?.bookIds || [];
  } else {
    ids = books.filter(b => b.status === 0).map(b => b.id);
  }
  
  // フォールバック: 対象がない場合は全書籍
  if (ids.length === 0 && books.length > 0) {
    ids = books.filter(b => b.status === 0).map(b => b.id);
    if (ids.length === 0) {
      ids = books.map(b => b.id);
    }
  }
  
  return ids;
}

/**
 * Quest画面の計算済みデータを一括で取得
 * （将来的にキャッシュ可能な設計）
 */
export interface QuestComputedData {
  reviewLex: number;
  newLexCurrent: number;
  combinedLex: number;
  groupedReviewCards: Array<{ book: Book; cards: Card[] }>;
  groupedNewCards: Array<{ book: Book; cards: Card[] }>;
  globalNext: Card | null;
  globalNextBook: Book | null;
}

export function computeQuestData(
  dueCards: Card[],
  newCards: Card[],
  books: Book[]
): QuestComputedData {
  const reviewLex = calculateTotalLex(dueCards, books);
  const newLexCurrent = calculateTotalLex(newCards, books);
  const combinedLex = reviewLex + newLexCurrent;
  
  const groupedReviewCards = groupCardsByBook(dueCards, books);
  const groupedNewCards = groupCardsByBook(newCards, books);
  
  const globalNext = getGlobalNextCard(dueCards);
  const globalNextBook = getCardBook(globalNext, books);
  
  return {
    reviewLex,
    newLexCurrent,
    combinedLex,
    groupedReviewCards,
    groupedNewCards,
    globalNext,
    globalNextBook,
  };
}
