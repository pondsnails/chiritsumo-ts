/**
 * QuestService.test.ts
 * QuestServiceクラスのユニットテスト
 * 
 * テスト範囲:
 * - Repository依存性注入の動作確認
 * - ビジネスロジックの正確性検証
 * - エッジケース処理
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { QuestService } from '../QuestService';
import type { ICardRepository } from '@core/repository/CardRepository';
import type { IBookRepository } from '@core/repository/BookRepository';
import type { IInventoryPresetRepository } from '@core/repository/InventoryPresetRepository';
import type { Card, Book, InventoryPreset } from '@core/types';
import { BookMode, BookStatus, CardState } from '@core/constants/enums';

/**
 * モックRepository（テスト用）
 */
class MockCardRepository implements ICardRepository {
  private cards: Card[] = [];

  setMockData(cards: Card[]) {
    this.cards = cards;
  }

  async findDue(bookIds: string[], now: Date): Promise<Card[]> {
    return this.cards.filter(c => 
      bookIds.includes(c.bookId) && new Date(c.due) <= now
    );
  }

  async findNew(bookIds: string[]): Promise<Card[]> {
    return this.cards.filter(c => 
      bookIds.includes(c.bookId) && c.state === CardState.NEW
    );
  }

  async countByBookAndState(bookId: string, state: number): Promise<number> {
    return this.cards.filter(c => c.bookId === bookId && c.state === state).length;
  }

  // 他のメソッドは未実装（テストで不要）
  async findAll(): Promise<Card[]> { return []; }
  async findAllPaginated(): Promise<Card[]> { return []; }
  async findByBook(): Promise<Card[]> { return []; }
  async findPaginated(): Promise<Card[]> { return []; }
  async countCards(): Promise<number> { return 0; }
  async create(): Promise<void> {}
  async bulkCreate(): Promise<void> {}
  async bulkUpsert(): Promise<void> {}
  async update(): Promise<void> {}
  async deleteByBook(): Promise<void> {}
  async deleteAll(): Promise<void> {}
  async resetAll(): Promise<void> {}
  async getCardCountsByBookMode(): Promise<any[]> { return []; }
  async getReviewCountByDate(): Promise<any[]> { return []; }
  async getAverageRetentionStats(): Promise<any> { return { avgRetention: 0, totalReviewedCards: 0 }; }
  async getRetentionByElapsedDays(): Promise<any[]> { return []; }
}

class MockBookRepository implements IBookRepository {
  private books: Book[] = [];

  setMockData(books: Book[]) {
    this.books = books;
  }

  async findAll(): Promise<Book[]> {
    return this.books;
  }

  async findActive(): Promise<Book[]> {
    return this.books.filter(b => b.status === BookStatus.ACTIVE);
  }

  async findById(id: string): Promise<Book | null> {
    return this.books.find(b => b.id === id) ?? null;
  }

  // 他のメソッドは未実装
  async findAllPaginated(): Promise<Book[]> { return []; }
  async create(): Promise<void> {}
  async createWithCards(): Promise<void> {}
  async update(): Promise<void> {}
  async delete(): Promise<void> {}
  async bulkUpsert(): Promise<void> {}
  async deleteAll(): Promise<void> {}
}

class MockInventoryPresetRepository implements IInventoryPresetRepository {
  private presets: InventoryPreset[] = [];

  setMockData(presets: InventoryPreset[]) {
    this.presets = presets;
  }

  async findAll(): Promise<InventoryPreset[]> {
    return this.presets;
  }

  async findDefault(): Promise<InventoryPreset | null> {
    return this.presets.find(p => p.isDefault) ?? null;
  }

  // 他のメソッドは未実装
  async create(): Promise<void> {}
  async update(): Promise<void> {}
  async delete(): Promise<void> {}
}

/**
 * テストデータ生成ヘルパー
 */
function createMockBook(overrides: Partial<Book> = {}): Book {
  return {
    id: 'book-1',
    userId: 'user-1',
    subjectId: null,
    title: 'Test Book',
    isbn: null,
    mode: BookMode.READ,
    totalUnit: 100,
    chunkSize: 1,
    completedUnit: 0,
    status: BookStatus.ACTIVE,
    previousBookId: null,
    priority: 1,
    coverPath: null,
    targetCompletionDate: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function createMockCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 'card-1',
    bookId: 'book-1',
    unitIndex: 0,
    state: CardState.NEW,
    stability: 0,
    difficulty: 0,
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
    due: new Date(),
    lastReview: null,
    photoPath: null,
    ...overrides,
  };
}

function createMockPreset(overrides: Partial<InventoryPreset> = {}): InventoryPreset {
  return {
    id: 1,
    label: 'Test Preset',
    iconCode: 0,
    bookIds: [],
    isDefault: false,
    ...overrides,
  };
}

/**
 * テストスイート
 */
describe('QuestService', () => {
  let service: QuestService;
  let mockCardRepo: MockCardRepository;
  let mockBookRepo: MockBookRepository;
  let mockPresetRepo: MockInventoryPresetRepository;

  beforeEach(() => {
    mockCardRepo = new MockCardRepository();
    mockBookRepo = new MockBookRepository();
    mockPresetRepo = new MockInventoryPresetRepository();
    service = new QuestService(mockCardRepo, mockBookRepo, mockPresetRepo);
  });

  describe('getDueCardsForToday', () => {
    it('今日期限到来のカードを取得できる', async () => {
      const book = createMockBook();
      const dueCard = createMockCard({ 
        id: 'due-1', 
        due: new Date(Date.now() - 1000 * 60 * 60), // 1時間前
        state: CardState.REVIEW,
      });
      const futureCard = createMockCard({ 
        id: 'future-1', 
        due: new Date(Date.now() + 1000 * 60 * 60), // 1時間後
        state: CardState.REVIEW,
      });

      mockBookRepo.setMockData([book]);
      mockCardRepo.setMockData([dueCard, futureCard]);

      const result = await service.getDueCardsForToday();
      
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('due-1');
    });

    it('対象書籍を指定して期限到来カードを取得できる', async () => {
      const book1 = createMockBook({ id: 'book-1' });
      const book2 = createMockBook({ id: 'book-2' });
      const card1 = createMockCard({ 
        id: 'card-1', 
        bookId: 'book-1',
        due: new Date(Date.now() - 1000),
        state: CardState.REVIEW,
      });
      const card2 = createMockCard({ 
        id: 'card-2', 
        bookId: 'book-2',
        due: new Date(Date.now() - 1000),
        state: CardState.REVIEW,
      });

      mockBookRepo.setMockData([book1, book2]);
      mockCardRepo.setMockData([card1, card2]);

      const result = await service.getDueCardsForToday(['book-1']);
      
      expect(result.length).toBe(1);
      expect(result[0].bookId).toBe('book-1');
    });
  });

  describe('getNewCardsForBooks', () => {
    it('指定書籍の新規カードを取得できる', async () => {
      const card1 = createMockCard({ id: 'new-1', bookId: 'book-1', state: CardState.NEW });
      const card2 = createMockCard({ id: 'review-1', bookId: 'book-1', state: CardState.REVIEW });

      mockCardRepo.setMockData([card1, card2]);

      const result = await service.getNewCardsForBooks(['book-1']);
      
      expect(result.length).toBe(1);
      expect(result[0].state).toBe(CardState.NEW);
    });
  });

  describe('calculateTotalLex', () => {
    it('READモードのカード合計Lexを正確に計算できる', () => {
      const book = createMockBook({ id: 'book-1', mode: BookMode.READ });
      const cards = [
        createMockCard({ id: 'c1', bookId: 'book-1' }),
        createMockCard({ id: 'c2', bookId: 'book-1' }),
      ];

      const totalLex = service.calculateTotalLex(cards, [book]);
      
      // READモード: 1カード = 10 Lex
      expect(totalLex).toBe(20);
    });

    it('WRITEモードのカード合計Lexを正確に計算できる', () => {
      const book = createMockBook({ id: 'book-1', mode: BookMode.WRITE });
      const cards = [
        createMockCard({ id: 'c1', bookId: 'book-1' }),
        createMockCard({ id: 'c2', bookId: 'book-1' }),
      ];

      const totalLex = service.calculateTotalLex(cards, [book]);
      
      // WRITEモード: 1カード = 30 Lex
      expect(totalLex).toBe(60);
    });

    it('RECITEモードのカード合計Lexを正確に計算できる', () => {
      const book = createMockBook({ id: 'book-1', mode: BookMode.RECITE });
      const cards = [
        createMockCard({ id: 'c1', bookId: 'book-1' }),
      ];

      const totalLex = service.calculateTotalLex(cards, [book]);
      
      // RECITEモード: 1カード = 60 Lex
      expect(totalLex).toBe(60);
    });

    it('複数書籍・複数モードの混在時に正確に計算できる', () => {
      const book1 = createMockBook({ id: 'book-1', mode: BookMode.READ });
      const book2 = createMockBook({ id: 'book-2', mode: BookMode.WRITE });
      const cards = [
        createMockCard({ id: 'c1', bookId: 'book-1' }), // 10 Lex
        createMockCard({ id: 'c2', bookId: 'book-2' }), // 30 Lex
      ];

      const totalLex = service.calculateTotalLex(cards, [book1, book2]);
      
      expect(totalLex).toBe(40);
    });
  });

  describe('groupCardsByBook', () => {
    it('カードを書籍別にグループ化できる', () => {
      const book1 = createMockBook({ id: 'book-1', title: 'Book A' });
      const book2 = createMockBook({ id: 'book-2', title: 'Book B' });
      const cards = [
        createMockCard({ id: 'c1', bookId: 'book-1' }),
        createMockCard({ id: 'c2', bookId: 'book-1' }),
        createMockCard({ id: 'c3', bookId: 'book-2' }),
      ];

      const grouped = service.groupCardsByBook(cards, [book1, book2]);
      
      expect(grouped.length).toBe(2);
      expect(grouped[0].book.id).toBe('book-1');
      expect(grouped[0].cards.length).toBe(2);
      expect(grouped[1].book.id).toBe('book-2');
      expect(grouped[1].cards.length).toBe(1);
    });

    it('存在しない書籍のカードは除外される', () => {
      const book1 = createMockBook({ id: 'book-1' });
      const cards = [
        createMockCard({ id: 'c1', bookId: 'book-1' }),
        createMockCard({ id: 'c2', bookId: 'book-999' }), // 存在しない書籍
      ];

      const grouped = service.groupCardsByBook(cards, [book1]);
      
      expect(grouped.length).toBe(1);
      expect(grouped[0].book.id).toBe('book-1');
    });
  });

  describe('getGlobalNextCard', () => {
    it('期限が最も古いカードを取得できる', () => {
      const cards = [
        createMockCard({ id: 'c1', due: new Date('2025-01-15') }),
        createMockCard({ id: 'c2', due: new Date('2025-01-10') }), // 最も古い
        createMockCard({ id: 'c3', due: new Date('2025-01-20') }),
      ];

      const next = service.getGlobalNextCard(cards);
      
      expect(next).not.toBeNull();
      expect(next!.id).toBe('c2');
    });

    it('カードが0件の場合nullを返す', () => {
      const next = service.getGlobalNextCard([]);
      
      expect(next).toBeNull();
    });
  });

  describe('resolveTargetBookIds', () => {
    it('プリセット未指定時はすべてのアクティブ書籍IDを返す', () => {
      const books = [
        createMockBook({ id: 'book-1', status: BookStatus.ACTIVE }),
        createMockBook({ id: 'book-2', status: BookStatus.ACTIVE }),
        createMockBook({ id: 'book-3', status: BookStatus.COMPLETED }),
      ];
      const presets: InventoryPreset[] = [];

      const ids = service.resolveTargetBookIds(books, presets, null);
      
      expect(ids).toEqual(['book-1', 'book-2']);
    });

    it('プリセット指定時はプリセットの書籍IDを返す', () => {
      const books = [
        createMockBook({ id: 'book-1', status: BookStatus.ACTIVE }),
        createMockBook({ id: 'book-2', status: BookStatus.ACTIVE }),
      ];
      const presets = [
        createMockPreset({ id: 1, bookIds: ['book-1'], isDefault: false }),
      ];

      const ids = service.resolveTargetBookIds(books, presets, 1);
      
      expect(ids).toEqual(['book-1']);
    });

    it('プリセットのbookIdsが空の場合はすべてのアクティブ書籍IDを返す', () => {
      const books = [
        createMockBook({ id: 'book-1', status: BookStatus.ACTIVE }),
        createMockBook({ id: 'book-2', status: BookStatus.ACTIVE }),
      ];
      const presets = [
        createMockPreset({ id: 1, bookIds: [], isDefault: false }),
      ];

      const ids = service.resolveTargetBookIds(books, presets, 1);
      
      expect(ids).toEqual(['book-1', 'book-2']);
    });
  });

  describe('filterTodayNewCards', () => {
    it('今日作成されたカードのみを返す', () => {
      const today = new Date().toISOString();
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const cards = [
        { ...createMockCard({ id: 'c1' }), createdAt: today },
        { ...createMockCard({ id: 'c2' }), createdAt: yesterday },
      ] as any;

      const filtered = service.filterTodayNewCards(cards);
      
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('c1');
    });

    it('createdAtが存在しないカードは除外される', () => {
      const cards = [
        createMockCard({ id: 'c1' }), // createdAtなし
      ];

      const filtered = service.filterTodayNewCards(cards);
      
      expect(filtered.length).toBe(0);
    });
  });

  describe('getBookStatistics', () => {
    it('書籍の新規カード数と復習待ちカード数を取得できる', async () => {
      const cards = [
        createMockCard({ id: 'c1', bookId: 'book-1', state: CardState.NEW }),
        createMockCard({ id: 'c2', bookId: 'book-1', state: CardState.NEW }),
        createMockCard({ id: 'c3', bookId: 'book-1', state: CardState.REVIEW }),
      ];

      mockCardRepo.setMockData(cards);

      const stats = await service.getBookStatistics('book-1');
      
      expect(stats.newCount).toBe(2);
      expect(stats.reviewCount).toBe(1);
    });
  });
});
