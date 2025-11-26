import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Book, Card, LedgerEntry, InventoryPreset } from '../types';

const STORAGE_KEYS = {
  BOOKS: '@chiritsmo/books',
  CARDS: '@chiritsmo/cards',
  LEDGER: '@chiritsmo/ledger',
  PRESETS: '@chiritsmo/presets',
};

export const localDB = {
  books: {
    getAll: async (): Promise<Book[]> => {
      try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.BOOKS);
        return data ? JSON.parse(data) : [];
      } catch (error) {
        console.error('Failed to get books:', error);
        return [];
      }
    },

    save: async (books: Book[]): Promise<void> => {
      try {
        await AsyncStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(books));
      } catch (error) {
        console.error('Failed to save books:', error);
      }
    },

    add: async (book: Book): Promise<void> => {
      const books = await localDB.books.getAll();
      books.push(book);
      await localDB.books.save(books);
    },

    update: async (id: string, updates: Partial<Book>): Promise<void> => {
      const books = await localDB.books.getAll();
      const index = books.findIndex(b => b.id === id);
      if (index !== -1) {
        books[index] = { ...books[index], ...updates, updatedAt: new Date().toISOString() };
        await localDB.books.save(books);
      }
    },

    delete: async (id: string): Promise<void> => {
      const books = await localDB.books.getAll();
      const filtered = books.filter(b => b.id !== id);
      await localDB.books.save(filtered);
    },
  },

  cards: {
    getAll: async (): Promise<Card[]> => {
      try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.CARDS);
        return data ? JSON.parse(data) : [];
      } catch (error) {
        console.error('Failed to get cards:', error);
        return [];
      }
    },

    save: async (cards: Card[]): Promise<void> => {
      try {
        await AsyncStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(cards));
      } catch (error) {
        console.error('Failed to save cards:', error);
      }
    },

    getByBookIds: async (bookIds: string[]): Promise<Card[]> => {
      const cards = await localDB.cards.getAll();
      return cards.filter(c => bookIds.includes(c.bookId));
    },

    getDue: async (bookIds: string[]): Promise<Card[]> => {
      const now = new Date().toISOString();
      const cards = await localDB.cards.getByBookIds(bookIds);
      return cards.filter(c => c.due <= now).sort((a, b) => a.due.localeCompare(b.due));
    },

    update: async (id: string, updates: Partial<Card>): Promise<void> => {
      const cards = await localDB.cards.getAll();
      const index = cards.findIndex(c => c.id === id);
      if (index !== -1) {
        cards[index] = { ...cards[index], ...updates, updatedAt: new Date().toISOString() };
        await localDB.cards.save(cards);
      }
    },

    bulkCreate: async (newCards: Card[]): Promise<void> => {
      const cards = await localDB.cards.getAll();
      cards.push(...newCards);
      await localDB.cards.save(cards);
    },
  },

  ledger: {
    getAll: async (): Promise<LedgerEntry[]> => {
      try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.LEDGER);
        return data ? JSON.parse(data) : [];
      } catch (error) {
        console.error('Failed to get ledger:', error);
        return [];
      }
    },

    save: async (entries: LedgerEntry[]): Promise<void> => {
      try {
        await AsyncStorage.setItem(STORAGE_KEYS.LEDGER, JSON.stringify(entries));
      } catch (error) {
        console.error('Failed to save ledger:', error);
      }
    },

    getRecent: async (limit: number = 30): Promise<LedgerEntry[]> => {
      const entries = await localDB.ledger.getAll();
      return entries
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, limit);
    },

    add: async (entry: LedgerEntry): Promise<void> => {
      const entries = await localDB.ledger.getAll();
      entries.push(entry);
      await localDB.ledger.save(entries);
    },

    updateToday: async (earnedLex: number, targetLex: number): Promise<void> => {
      const entries = await localDB.ledger.getAll();
      const today = new Date().toISOString().split('T')[0];
      const todayIndex = entries.findIndex(e => e.date.startsWith(today));

      if (todayIndex !== -1) {
        const previousBalance = todayIndex > 0 ? entries[todayIndex - 1].balance : 0;
        entries[todayIndex] = {
          ...entries[todayIndex],
          earnedLex,
          targetLex,
          balance: previousBalance + earnedLex - targetLex,
        };
      } else {
        const previousBalance = entries.length > 0 ? entries[entries.length - 1].balance : 0;
        entries.push({
          id: Date.now(),
          userId: 'local',
          date: new Date().toISOString(),
          earnedLex,
          targetLex,
          balance: previousBalance + earnedLex - targetLex,
          createdAt: new Date().toISOString(),
        });
      }

      await localDB.ledger.save(entries);
    },
  },

  presets: {
    getAll: async (): Promise<InventoryPreset[]> => {
      try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.PRESETS);
        return data ? JSON.parse(data) : [];
      } catch (error) {
        console.error('Failed to get presets:', error);
        return [];
      }
    },

    save: async (presets: InventoryPreset[]): Promise<void> => {
      try {
        await AsyncStorage.setItem(STORAGE_KEYS.PRESETS, JSON.stringify(presets));
      } catch (error) {
        console.error('Failed to save presets:', error);
      }
    },
  },
};
