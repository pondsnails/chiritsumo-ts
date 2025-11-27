/**
 * QuestService
 * Repository依存性注入対応：Service層でデータ取得から計算まで完結
 * 
 * 設計方針:
 * - Repository interfaceに依存（テスト時にモック可能）
 * - 純粋関数は後方互換のため残存（Legacy関数として）
 * - Hook層はUIロジックのみに専念
 */

import type { Card, Book, InventoryPreset } from '@core/types';
import type { ICardRepository } from '@core/repository/CardRepository';
import type { IBookRepository } from '@core/repository/BookRepository';
import type { IInventoryPresetRepository } from '@core/repository/InventoryPresetRepository';
import { calculateLexPerCard } from '@core/logic/lexCalculator';
import { BookMode, BookStatus, CardState } from '@core/constants/enums';

/**
 * QuestServiceクラス（依存性注入対応）
 */
export class QuestService {
  constructor(
    private cardRepo: ICardRepository,
    private bookRepo: IBookRepository,
    private presetRepo: IInventoryPresetRepository
  ) {}

  /**
   * 今日の期限到来カードを取得（Service層でDB呼び出し）
   * @param bookIds 対象書籍ID（省略時はすべての書籍）
   */
  async getDueCardsForToday(bookIds?: string[]): Promise<Card[]> {
    const now = new Date();
    const targetBookIds = bookIds ?? (await this.getActiveBooks()).map(b => b.id);
    return await this.cardRepo.findDue(targetBookIds, now);
  }

  /**
   * 指定書籍の新規カードを取得
   */
  async getNewCardsForBooks(bookIds: string[]): Promise<Card[]> {
    return await this.cardRepo.findNew(bookIds);
  }

  /**
   * アクティブな書籍を取得
   */
  async getActiveBooks(): Promise<Book[]> {
    const allBooks = await this.bookRepo.findAll();
    return allBooks.filter(b => b.status === BookStatus.ACTIVE);
  }

  /**
   * プリセット一覧取得
   */
  async getInventoryPresets(): Promise<InventoryPreset[]> {
    return await this.presetRepo.findAll();
  }

  /**
   * デフォルトプリセット取得
   */
  async getDefaultPreset(): Promise<InventoryPreset | null> {
    return await this.presetRepo.findDefault();
  }

  /**
   * カードリストから総Lex数を計算
   */
  calculateTotalLex(cards: Card[], books: Book[]): number {
    const modeMap = new Map(books.map(b => [b.id, b.mode]));
    return cards.reduce((sum, card) => {
      const mode = modeMap.get(card.bookId) ?? BookMode.READ;
      return sum + calculateLexPerCard(mode);
    }, 0);
  }

  /**
   * カードを書籍別にグループ化
   */
  groupCardsByBook(
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
  getGlobalNextCard(dueCards: Card[]): Card | null {
    if (dueCards.length === 0) return null;
    
    const now = new Date();
    return dueCards.reduce((earliest, card) => {
      const cardDue = new Date(card.due);
      const earliestDue = new Date(earliest.due);
      return cardDue < earliestDue ? card : earliest;
    }, dueCards[0]);
  }

  /**
   * 対象書籍IDの解決（プリセット指定またはすべて）
   */
  resolveTargetBookIds(
    books: Book[], 
    presets: InventoryPreset[], 
    activePresetId: number | null
  ): string[] {
    if (!activePresetId) {
      return books.map(b => b.id);
    }
    
    const preset = presets.find(p => p.id === activePresetId);
    if (!preset) return books.map(b => b.id);
    
    // bookIdsはstring[]型（types/index.tsで定義済み）
    const bookIds = preset.bookIds.filter(Boolean);
    return bookIds.length > 0 ? bookIds : books.map(b => b.id);
  }

  /**
   * 今日作成された新規カードをフィルタ（ロールオーバー対策）
   */
  filterTodayNewCards(cards: Card[]): Card[] {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartUnix = Math.floor(todayStart.getTime() / 1000);
    
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const tomorrowStartUnix = Math.floor(tomorrowStart.getTime() / 1000);
    
    return cards.filter(c => {
      if (!c.createdAt) return false;
      return c.createdAt >= todayStartUnix && c.createdAt < tomorrowStartUnix;
    });
  }

  /**
   * 書籍統計の取得（新規カード数、復習待ちカード数）
   */
  async getBookStatistics(bookId: string): Promise<{
    newCount: number;
    reviewCount: number;
  }> {
    const newCount = await this.cardRepo.countByBookAndState(bookId, CardState.NEW);
    const reviewCount = await this.cardRepo.countByBookAndState(bookId, CardState.REVIEW);
    return { newCount, reviewCount };
  }
}

/**
 * Legacy純粋関数（互換性のため残す）
 */
export function calculateTotalLex(cards: Card[], books: Book[]): number {
  const modeMap = new Map(books.map(b => [b.id, b.mode]));
  return cards.reduce((sum, card) => {
    const mode = modeMap.get(card.bookId) ?? BookMode.READ;
    return sum + calculateLexPerCard(mode);
  }, 0);
}

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

export function getGlobalNextCard(dueCards: Card[]): Card | null {
  if (dueCards.length === 0) return null;
  
  const now = new Date();
  return dueCards.reduce((earliest, card) => {
    const cardDue = new Date(card.due);
    const earliestDue = new Date(earliest.due);
    return cardDue < earliestDue ? card : earliest;
  }, dueCards[0]);
}

export function resolveTargetBookIds(
  activePresetId: number | null,
  presets: InventoryPreset[],
  books: Book[]
): string[] {
  if (!activePresetId) {
    return books.filter(b => b.status === BookStatus.ACTIVE).map(b => b.id);
  }
  
  const preset = presets.find(p => p.id === activePresetId);
  if (!preset) return books.filter(b => b.status === BookStatus.ACTIVE).map(b => b.id);
  
  const bookIds = preset.bookIds.filter(Boolean);
  return bookIds.length > 0 ? bookIds : books.filter(b => b.status === BookStatus.ACTIVE).map(b => b.id);
}

export function filterTodayNewCards(allNew: Card[], targetBookIds: string[]): Card[] {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return allNew.filter(c => {
    if (!targetBookIds.includes(c.bookId)) return false;
    // createdAt が存在しない場合は除外（古いデータ）
    if (!('createdAt' in c) || !c.createdAt) return false;
    const createdDate = new Date(c.createdAt).toISOString().slice(0, 10);
    return createdDate === today;
  });
}

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
  const globalNextBook = globalNext ? books.find(b => b.id === globalNext.bookId) ?? null : null;
  
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
