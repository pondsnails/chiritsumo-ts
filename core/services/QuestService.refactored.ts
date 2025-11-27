/**
 * QuestService (Refactored)
 * Repository依存性注入対応：God Hookからの完全脱却
 * データ取得からビジネスロジックまでService層で完結
 */

import type { Card, Book, InventoryPreset } from '@core/types';
import { calculateLexPerCard } from '@core/logic/lexCalculator';
import { BookMode, BookStatus, CardState } from '@core/constants/enums';

/**
 * Repository Interfaces (DI用)
 */
export interface ICardRepository {
  findDue(date: Date): Promise<Card[]>;
  findNew(bookId: string, limit: number): Promise<Card[]>;
  countByBookAndState(bookId: string, state: CardState): Promise<number>;
}

export interface IBookRepository {
  findAll(): Promise<Book[]>;
  findActive(): Promise<Book[]>;
  findById(id: string): Promise<Book | null>;
}

export interface IInventoryPresetRepository {
  findAll(): Promise<InventoryPreset[]>;
  findDefault(): Promise<InventoryPreset | null>;
}

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
   */
  async getDueCardsForToday(): Promise<Card[]> {
    const now = new Date();
    return await this.cardRepo.findDue(now);
  }

  /**
   * 指定書籍の新規カードを取得（制限付き）
   */
  async getNewCardsForBook(bookId: string, limit: number): Promise<Card[]> {
    return await this.cardRepo.findNew(bookId, limit);
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
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    return cards.filter(c => {
      // createdAtがない場合はスキップ（型安全性）
      if (!('createdAt' in c)) return false;
      const createdDate = new Date((c as any).createdAt).toISOString().slice(0, 10);
      return createdDate === today;
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
