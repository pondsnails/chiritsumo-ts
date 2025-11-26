// Web版はLocalStorageベースの実装（Local First）
import type { Book, Card, LedgerEntry, InventoryPreset } from '../types';

const STORAGE_KEYS = {
  BOOKS: 'chiritsumo_books',
  CARDS: 'chiritsumo_cards',
  LEDGER: 'chiritsumo_ledger',
  PRESETS: 'chiritsumo_presets',
};

export async function initializeDatabase() {
  console.log('Using LocalStorage for web platform (Local First)');
  
  // 初期データがなければ作成
  if (!localStorage.getItem(STORAGE_KEYS.BOOKS)) {
    localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.CARDS)) {
    localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.LEDGER)) {
    localStorage.setItem(STORAGE_KEYS.LEDGER, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.PRESETS)) {
    localStorage.setItem(STORAGE_KEYS.PRESETS, JSON.stringify([]));
  }
}

export const booksDB = {
  getAll: async (): Promise<Book[]> => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BOOKS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get books:', error);
      return [];
    }
  },

  getById: async (id: string): Promise<Book | null> => {
    try {
      const books = await booksDB.getAll();
      return books.find(b => b.id === id) || null;
    } catch (error) {
      console.error('Failed to get book:', error);
      return null;
    }
  },

  add: async (book: Book): Promise<void> => {
    const books = await booksDB.getAll();
    books.push(book);
    localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(books));
  },

  update: async (id: string, updates: Partial<Book>): Promise<void> => {
    const books = await booksDB.getAll();
    const index = books.findIndex(b => b.id === id);
    if (index !== -1) {
      books[index] = { ...books[index], ...updates, updatedAt: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(books));
    }
  },

  delete: async (id: string): Promise<void> => {
    const books = await booksDB.getAll();
    const filtered = books.filter(b => b.id !== id);
    localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(filtered));
    
    // 関連カードも削除
    const cards = await cardsDB.getAll();
    const filteredCards = cards.filter(c => c.bookId !== id);
    localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(filteredCards));
  },
};

export const cardsDB = {
  getAll: async (): Promise<Card[]> => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CARDS);
      const cards = data ? JSON.parse(data) : [];
      // Date型に変換
      return cards.map((c: any) => ({
        ...c,
        due: new Date(c.due),
        lastReview: c.lastReview ? new Date(c.lastReview) : null,
      }));
    } catch (error) {
      console.error('Failed to get cards:', error);
      return [];
    }
  },

  getByBookId: async (bookId: string): Promise<Card[]> => {
    try {
      const cards = await cardsDB.getAll();
      return cards.filter(c => c.bookId === bookId);
    } catch (error) {
      console.error('Failed to get cards:', error);
      return [];
    }
  },

  getDueCards: async (bookIds: string[]): Promise<Card[]> => {
    try {
      const cards = await cardsDB.getAll();
      const now = new Date();
      return cards.filter(c => bookIds.includes(c.bookId) && c.due <= now);
    } catch (error) {
      console.error('Failed to get due cards:', error);
      return [];
    }
  },

  upsert: async (card: Card): Promise<void> => {
    const cards = await cardsDB.getAll();
    const index = cards.findIndex(c => c.id === card.id);
    
    if (index !== -1) {
      cards[index] = card;
    } else {
      cards.push(card);
    }
    
    localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(cards));
  },

  bulkUpsert: async (newCards: Card[]): Promise<void> => {
    const existingCards = await cardsDB.getAll();
    const cardMap = new Map(existingCards.map(c => [c.id, c]));
    
    newCards.forEach(card => {
      cardMap.set(card.id, card);
    });
    
    localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(Array.from(cardMap.values())));
  },

  update: async (id: string, updates: Partial<Card>): Promise<void> => {
    const cards = await cardsDB.getAll();
    const index = cards.findIndex(c => c.id === id);
    
    if (index !== -1) {
      cards[index] = { ...cards[index], ...updates };
      localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(cards));
    }
  },
};

export const ledgerDB = {
  getAll: async (): Promise<LedgerEntry[]> => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LEDGER);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get ledger:', error);
      return [];
    }
  },

  getRecent: async (limit: number): Promise<LedgerEntry[]> => {
    const entries = await ledgerDB.getAll();
    return entries
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);
  },

  add: async (entry: LedgerEntry): Promise<void> => {
    const entries = await ledgerDB.getAll();
    entries.push(entry);
    localStorage.setItem(STORAGE_KEYS.LEDGER, JSON.stringify(entries));
  },

  upsert: async (entry: Omit<LedgerEntry, 'id' | 'userId' | 'createdAt'>): Promise<void> => {
    const entries = await ledgerDB.getAll();
    const index = entries.findIndex(e => e.date === entry.date);
    
    if (index !== -1) {
      entries[index] = { ...entries[index], ...entry };
    } else {
      entries.push({
        id: Date.now(),
        userId: 'local',
        createdAt: new Date().toISOString(),
        ...entry,
      } as LedgerEntry);
    }
    
    localStorage.setItem(STORAGE_KEYS.LEDGER, JSON.stringify(entries));
  },
};

export const inventoryPresetsDB = {
  getAll: async (): Promise<InventoryPreset[]> => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PRESETS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get presets:', error);
      return [];
    }
  },

  add: async (preset: InventoryPreset): Promise<void> => {
    const presets = await inventoryPresetsDB.getAll();
    presets.push(preset);
    localStorage.setItem(STORAGE_KEYS.PRESETS, JSON.stringify(presets));
  },

  update: async (id: number, updates: Partial<InventoryPreset>): Promise<void> => {
    const presets = await inventoryPresetsDB.getAll();
    const index = presets.findIndex(p => p.id === id);
    
    if (index !== -1) {
      presets[index] = { ...presets[index], ...updates };
      localStorage.setItem(STORAGE_KEYS.PRESETS, JSON.stringify(presets));
    }
  },

  delete: async (id: number): Promise<void> => {
    const presets = await inventoryPresetsDB.getAll();
    const filtered = presets.filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.PRESETS, JSON.stringify(filtered));
  },
};
