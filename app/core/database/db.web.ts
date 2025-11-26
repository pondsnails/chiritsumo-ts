import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Book, Card, LedgerEntry, InventoryPreset } from '../types';

export async function initializeDatabase() {
  console.log('Using AsyncStorage for web platform');
}

export const booksDB = {
  getAll: async (): Promise<Book[]> => {
    try {
      const data = await AsyncStorage.getItem('books');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get books:', error);
      return [];
    }
  },

  getById: async (id: string): Promise<Book | null> => {
    const books = await booksDB.getAll();
    return books.find((b) => b.id === id) || null;
  },

  add: async (book: Book): Promise<void> => {
    const books = await booksDB.getAll();
    books.push(book);
    await AsyncStorage.setItem('books', JSON.stringify(books));
  },

  update: async (id: string, updates: Partial<Book>): Promise<void> => {
    const books = await booksDB.getAll();
    const index = books.findIndex((b) => b.id === id);
    if (index !== -1) {
      books[index] = { ...books[index], ...updates, updatedAt: new Date().toISOString() };
      await AsyncStorage.setItem('books', JSON.stringify(books));
    }
  },

  delete: async (id: string): Promise<void> => {
    const books = await booksDB.getAll();
    const filtered = books.filter((b) => b.id !== id);
    await AsyncStorage.setItem('books', JSON.stringify(filtered));
  },
};

export const cardsDB = {
  getByBookId: async (bookId: string): Promise<Card[]> => {
    try {
      const data = await AsyncStorage.getItem('cards');
      const allCards: Card[] = data
        ? JSON.parse(data, (key, value) => {
            if (key === 'due' || key === 'lastReview') {
              return value ? new Date(value) : null;
            }
            return value;
          })
        : [];
      return allCards.filter((c) => c.bookId === bookId);
    } catch (error) {
      console.error('Failed to get cards:', error);
      return [];
    }
  },

  getDueCards: async (bookIds: string[]): Promise<Card[]> => {
    try {
      const data = await AsyncStorage.getItem('cards');
      const allCards: Card[] = data
        ? JSON.parse(data, (key, value) => {
            if (key === 'due' || key === 'lastReview') {
              return value ? new Date(value) : null;
            }
            return value;
          })
        : [];
      const now = new Date();
      return allCards.filter((c) => bookIds.includes(c.bookId) && c.due <= now).sort((a, b) => a.due.getTime() - b.due.getTime());
    } catch (error) {
      console.error('Failed to get due cards:', error);
      return [];
    }
  },

  upsert: async (card: Card): Promise<void> => {
    const data = await AsyncStorage.getItem('cards');
    const cards: Card[] = data
      ? JSON.parse(data, (key, value) => {
          if (key === 'due' || key === 'lastReview') {
            return value ? new Date(value) : null;
          }
          return value;
        })
      : [];
    const index = cards.findIndex((c) => c.id === card.id);
    if (index !== -1) {
      cards[index] = card;
    } else {
      cards.push(card);
    }
    await AsyncStorage.setItem('cards', JSON.stringify(cards));
  },

  bulkUpsert: async (cards: Card[]): Promise<void> => {
    const data = await AsyncStorage.getItem('cards');
    const existingCards: Card[] = data
      ? JSON.parse(data, (key, value) => {
          if (key === 'due' || key === 'lastReview') {
            return value ? new Date(value) : null;
          }
          return value;
        })
      : [];

    for (const card of cards) {
      const index = existingCards.findIndex((c) => c.id === card.id);
      if (index !== -1) {
        existingCards[index] = card;
      } else {
        existingCards.push(card);
      }
    }

    await AsyncStorage.setItem('cards', JSON.stringify(existingCards));
  },
};

export const ledgerDB = {
  getRecent: async (limit: number = 30): Promise<LedgerEntry[]> => {
    try {
      const data = await AsyncStorage.getItem('ledger');
      const entries: LedgerEntry[] = data ? JSON.parse(data) : [];
      return entries.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
    } catch (error) {
      console.error('Failed to get ledger:', error);
      return [];
    }
  },

  upsert: async (entry: Omit<LedgerEntry, 'id'>): Promise<void> => {
    const data = await AsyncStorage.getItem('ledger');
    const entries: LedgerEntry[] = data ? JSON.parse(data) : [];
    const index = entries.findIndex((e) => e.date === entry.date);

    if (index !== -1) {
      entries[index] = { ...entries[index], ...entry };
    } else {
      const newEntry = { ...entry, id: entries.length + 1 };
      entries.push(newEntry);
    }

    await AsyncStorage.setItem('ledger', JSON.stringify(entries));
  },
};

export const inventoryPresetsDB = {
  getAll: async (): Promise<InventoryPreset[]> => {
    try {
      const data = await AsyncStorage.getItem('inventory_presets');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get presets:', error);
      return [];
    }
  },

  add: async (preset: Omit<InventoryPreset, 'id'>): Promise<number> => {
    const presets = await inventoryPresetsDB.getAll();
    const newId = presets.length > 0 ? Math.max(...presets.map((p) => p.id)) + 1 : 1;
    const newPreset = { ...preset, id: newId };
    presets.push(newPreset);
    await AsyncStorage.setItem('inventory_presets', JSON.stringify(presets));
    return newId;
  },

  update: async (id: number, updates: Partial<InventoryPreset>): Promise<void> => {
    const presets = await inventoryPresetsDB.getAll();
    const index = presets.findIndex((p) => p.id === id);
    if (index !== -1) {
      presets[index] = { ...presets[index], ...updates };
      await AsyncStorage.setItem('inventory_presets', JSON.stringify(presets));
    }
  },

  delete: async (id: number): Promise<void> => {
    const presets = await inventoryPresetsDB.getAll();
    const filtered = presets.filter((p) => p.id !== id);
    await AsyncStorage.setItem('inventory_presets', JSON.stringify(filtered));
  },
};
