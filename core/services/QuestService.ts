/**
 * QuestService
 * Repository依存性注入対応：Service層でデータ取得から計算まで完結
 * 
 * 設計方針:
 * - Repository interfaceに依存（テスト時にモック可能）
 * - すべてのロジックをクラスメソッドとして実装（Legacy関数は削除済み）
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
    
    return dueCards.reduce((earliest, card) => {
      return card.due < earliest.due ? card : earliest;
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
    
    const bookIds = preset.bookIds.filter(Boolean);
    return bookIds.length > 0 ? bookIds : books.map(b => b.id);
  }

  /**
   * 今日作成された新規カードをフィルタ（ロールオーバー対策）
   * Unix Timestampで正しく範囲比較（タイムゾーン安全）
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
