// IndexedDB wrapper for Web platform (replaces localStorage)
import type { Book, Card, LedgerEntry, InventoryPreset } from '../types';

const DB_NAME = 'chiritsumo_db';
const DB_VERSION = 1;

const STORES = {
  BOOKS: 'books',
  CARDS: 'cards',
  LEDGER: 'ledger',
  PRESETS: 'presets',
};

let db: IDBDatabase | null = null;

/**
 * Initialize IndexedDB
 */
export async function initIndexedDB(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Books store
      if (!database.objectStoreNames.contains(STORES.BOOKS)) {
        const booksStore = database.createObjectStore(STORES.BOOKS, { keyPath: 'id' });
        booksStore.createIndex('status', 'status', { unique: false });
        booksStore.createIndex('priority', 'priority', { unique: false });
      }

      // Cards store
      if (!database.objectStoreNames.contains(STORES.CARDS)) {
        const cardsStore = database.createObjectStore(STORES.CARDS, { keyPath: 'id' });
        cardsStore.createIndex('bookId', 'bookId', { unique: false });
        cardsStore.createIndex('due', 'due', { unique: false });
        cardsStore.createIndex('state', 'state', { unique: false });
      }

      // Ledger store
      if (!database.objectStoreNames.contains(STORES.LEDGER)) {
        const ledgerStore = database.createObjectStore(STORES.LEDGER, { keyPath: 'id' });
        ledgerStore.createIndex('date', 'date', { unique: false });
      }

      // Presets store
      if (!database.objectStoreNames.contains(STORES.PRESETS)) {
        database.createObjectStore(STORES.PRESETS, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

/**
 * Generic get all from store
 */
async function getAll<T>(storeName: string): Promise<T[]> {
  const database = await initIndexedDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Generic get by key
 */
async function getByKey<T>(storeName: string, key: string | number): Promise<T | null> {
  const database = await initIndexedDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Generic add/update
 */
async function put<T>(storeName: string, value: T): Promise<void> {
  const database = await initIndexedDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(value);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Generic delete
 */
async function deleteByKey(storeName: string, key: string | number): Promise<void> {
  const database = await initIndexedDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Generic clear store
 */
async function clearStore(storeName: string): Promise<void> {
  const database = await initIndexedDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get by index
 */
async function getByIndex<T>(
  storeName: string,
  indexName: string,
  value: any
): Promise<T[]> {
  const database = await initIndexedDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(value);

    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get by index with range
 */
async function getByIndexRange<T>(
  storeName: string,
  indexName: string,
  range: IDBKeyRange
): Promise<T[]> {
  const database = await initIndexedDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(range);

    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

// ===== Books API =====

export const indexedBooksDB = {
  getAll: () => getAll<Book>(STORES.BOOKS),
  
  getById: (id: string) => getByKey<Book>(STORES.BOOKS, id),
  
  add: (book: Book) => put(STORES.BOOKS, book),
  
  update: async (id: string, updates: Partial<Book>) => {
    const book = await getByKey<Book>(STORES.BOOKS, id);
    if (book) {
      await put(STORES.BOOKS, { ...book, ...updates, updatedAt: new Date().toISOString() });
    }
  },
  
  delete: async (id: string) => {
    await deleteByKey(STORES.BOOKS, id);
    // Delete related cards
    const cards = await getByIndex<Card>(STORES.CARDS, 'bookId', id);
    for (const card of cards) {
      await deleteByKey(STORES.CARDS, card.id);
    }
  },
};

// ===== Cards API =====

export const indexedCardsDB = {
  getAll: async (): Promise<Card[]> => {
    const cards = await getAll<Card>(STORES.CARDS);
    // Convert date strings to Date objects
    return cards.map(c => ({
      ...c,
      due: new Date(c.due),
      lastReview: c.lastReview ? new Date(c.lastReview) : null,
    }));
  },
  
  getByBookId: async (bookId: string): Promise<Card[]> => {
    const cards = await getByIndex<Card>(STORES.CARDS, 'bookId', bookId);
    return cards.map(c => ({
      ...c,
      due: new Date(c.due),
      lastReview: c.lastReview ? new Date(c.lastReview) : null,
    }));
  },
  
  getDueCards: async (bookIds: string[]): Promise<Card[]> => {
    const now = new Date();
    const allCards = await getAll<Card>(STORES.CARDS);
    
    return allCards
      .filter(c => bookIds.includes(c.bookId) && new Date(c.due) <= now)
      .map(c => ({
        ...c,
        due: new Date(c.due),
        lastReview: c.lastReview ? new Date(c.lastReview) : null,
      }));
  },
  
  upsert: (card: Card) => put(STORES.CARDS, card),
  
  bulkUpsert: async (cards: Card[]) => {
    for (const card of cards) {
      await put(STORES.CARDS, card);
    }
  },
  
  update: async (id: string, updates: Partial<Card>) => {
    const card = await getByKey<Card>(STORES.CARDS, id);
    if (card) {
      await put(STORES.CARDS, { ...card, ...updates });
    }
  },
};

// ===== Ledger API =====

export const indexedLedgerDB = {
  getAll: () => getAll<LedgerEntry>(STORES.LEDGER),
  
  getRecent: async (limit: number): Promise<LedgerEntry[]> => {
    const entries = await getAll<LedgerEntry>(STORES.LEDGER);
    return entries
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);
  },
  
  add: (entry: LedgerEntry) => put(STORES.LEDGER, entry),
  
  upsert: async (entry: Omit<LedgerEntry, 'id' | 'userId' | 'createdAt'>) => {
    const entries = await getAll<LedgerEntry>(STORES.LEDGER);
    const existing = entries.find(e => e.date === entry.date);
    
    if (existing) {
      await put(STORES.LEDGER, { ...existing, ...entry });
    } else {
      await put(STORES.LEDGER, {
        id: Date.now(),
        userId: 'local',
        createdAt: new Date().toISOString(),
        ...entry,
      } as LedgerEntry);
    }
  },
};

// ===== Inventory Presets API =====

export const indexedPresetsDB = {
  getAll: () => getAll<InventoryPreset>(STORES.PRESETS),
  
  add: (preset: InventoryPreset) => put(STORES.PRESETS, preset),
  
  update: async (id: number, updates: Partial<InventoryPreset>) => {
    const preset = await getByKey<InventoryPreset>(STORES.PRESETS, id);
    if (preset) {
      await put(STORES.PRESETS, { ...preset, ...updates });
    }
  },
  
  delete: (id: number) => deleteByKey(STORES.PRESETS, id),
};

/**
 * Migration helper: Import from localStorage to IndexedDB
 */
export async function migrateFromLocalStorage(): Promise<void> {
  const books = localStorage.getItem('chiritsumo_books');
  const cards = localStorage.getItem('chiritsumo_cards');
  const ledger = localStorage.getItem('chiritsumo_ledger');
  const presets = localStorage.getItem('chiritsumo_presets');

  if (books) {
    const booksData = JSON.parse(books) as Book[];
    for (const book of booksData) {
      await put(STORES.BOOKS, book);
    }
  }

  if (cards) {
    const cardsData = JSON.parse(cards) as Card[];
    for (const card of cardsData) {
      await put(STORES.CARDS, card);
    }
  }

  if (ledger) {
    const ledgerData = JSON.parse(ledger) as LedgerEntry[];
    for (const entry of ledgerData) {
      await put(STORES.LEDGER, entry);
    }
  }

  if (presets) {
    const presetsData = JSON.parse(presets) as InventoryPreset[];
    for (const preset of presetsData) {
      await put(STORES.PRESETS, preset);
    }
  }

  console.log('Migration from localStorage to IndexedDB completed');
}
