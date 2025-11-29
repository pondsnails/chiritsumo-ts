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
   * 
   * パフォーマンス改善:
   * - ✅ findAll() → findActive() に変更
   * - ✅ SQL WHERE status = 0 で絞り込み
   * - ✅ JavaScriptフィルター削除
   * 
   * レビュー指摘: "bookRepo.findAll() が頻繁に使われているが、アプリの規模が大きくなりBookが増えた際、起動時間が劣化"
   * → SQLレベルでフィルタリングに変更
   */
  async getActiveBooks(): Promise<Book[]> {
    return await this.bookRepo.findActive();
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
    // プリセット指定がある場合は従来通り
    if (activePresetId) {
      const preset = presets.find(p => p.id === activePresetId);
      if (!preset) return books.map(b => b.id);
      const bookIds = preset.bookIds.filter(Boolean);
      return bookIds.length > 0 ? bookIds : books.map(b => b.id);
    }

    // プリセット未選択: ルート最上位の進行中1冊のみを対象
    // priority=1 をメインルートとみなし previous_book_id チェーンを辿る
    try {
      const mainLine = books.filter(b => b.priority === 1);
      if (mainLine.length === 0) return books.map(b => b.id);
      const idSet = new Set(mainLine.map(b => b.id));
      const roots = mainLine.filter(b => !b.previousBookId || !idSet.has(b.previousBookId));
      if (roots.length === 0) return books.map(b => b.id);
      roots.sort((a, b) => a.createdAt - b.createdAt);
      const root = roots[0];
      const nextMap = new Map<string, Book>();
      for (const b of mainLine) if (b.previousBookId) nextMap.set(b.previousBookId, b);
      const chain: Book[] = [];
      const guard = new Set<string>();
      let cursor: Book | undefined = root;
      while (cursor && !guard.has(cursor.id)) {
        chain.push(cursor);
        guard.add(cursor.id);
        cursor = nextMap.get(cursor.id);
      }
      const active = chain.find(b => b.status === BookStatus.ACTIVE);
      if (active) return [active.id];
      if (chain.length > 0) return [chain[chain.length - 1].id];
    } catch (e) {
      console.warn('[QuestService] Route resolution failed, fallback to all:', e);
      return books.map(b => b.id);
    }
    return books.map(b => b.id);
  }

  /**
   * ルート（priority=1 チェーン）上で進行中書籍を自動アクティブ化
   * 要件: ルート先頭が完了済みなら次の未完了書籍を ACTIVE に昇格
   */
  async autoActivateRoute(): Promise<void> {
    try {
      const all = await this.bookRepo.findAll();
      const mainLine = all.filter(b => b.priority === 1);
      if (mainLine.length === 0) return;
      const idSet = new Set(mainLine.map(b => b.id));
      const roots = mainLine.filter(b => !b.previousBookId || !idSet.has(b.previousBookId));
      if (roots.length === 0) return;
      roots.sort((a, b) => a.createdAt - b.createdAt);
      const root = roots[0];
      const nextMap = new Map<string, Book>();
      for (const b of mainLine) if (b.previousBookId) nextMap.set(b.previousBookId, b);
      const chain: Book[] = [];
      const guard = new Set<string>();
      let cursor: Book | undefined = root;
      while (cursor && !guard.has(cursor.id)) {
        chain.push(cursor);
        guard.add(cursor.id);
        cursor = nextMap.get(cursor.id);
      }
      // 既にACTIVEが存在すれば何もしない
      if (chain.some(b => b.status === BookStatus.ACTIVE)) return;
      // 最初に未完了(COMPLETEDでない)な書籍をACTIVE化
      const target = chain.find(b => b.status !== BookStatus.COMPLETED);
      if (target && target.status !== BookStatus.ACTIVE) {
        await this.bookRepo.update(target.id, { status: BookStatus.ACTIVE });
      }
    } catch (e) {
      console.warn('[QuestService] autoActivateRoute failed:', e);
    }
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
