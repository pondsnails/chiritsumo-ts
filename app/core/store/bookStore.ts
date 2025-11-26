import { create } from 'zustand';
import { localDB } from '../database/localStorage';
import { supabaseDB } from '../database/supabaseDB';
import { supabase } from '../database/supabase';
import type { Book } from '../types';

interface BookState {
  books: Book[];
  isLoading: boolean;
  error: string | null;
  fetchBooks: () => Promise<void>;
  addBook: (book: Book) => Promise<void>;
  updateBook: (id: string, updates: Partial<Book>) => Promise<void>;
  deleteBook: (id: string) => Promise<void>;
  syncWithSupabase: () => Promise<void>;
}

export const useBookStore = create<BookState>((set, get) => ({
  books: [],
  isLoading: false,
  error: null,

  fetchBooks: async () => {
    try {
      set({ isLoading: true, error: null });
      const books = await localDB.books.getAll();
      set({ books });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch books';
      set({ error: message });
    } finally {
      set({ isLoading: false });
    }
  },

  addBook: async (book: Book) => {
    try {
      await localDB.books.add(book);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabaseDB.books.add(user.id, book).catch(console.error);
      }

      await get().fetchBooks();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add book';
      set({ error: message });
      throw error;
    }
  },

  updateBook: async (id: string, updates: Partial<Book>) => {
    try {
      await localDB.books.update(id, updates);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabaseDB.books.update(id, updates).catch(console.error);
      }

      await get().fetchBooks();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update book';
      set({ error: message });
      throw error;
    }
  },

  deleteBook: async (id: string) => {
    try {
      await localDB.books.delete(id);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabaseDB.books.delete(id).catch(console.error);
      }

      await get().fetchBooks();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete book';
      set({ error: message });
      throw error;
    }
  },

  syncWithSupabase: async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const remoteBooks = await supabaseDB.books.getAll(user.id);
      const localBooks = await localDB.books.getAll();

      for (const remoteBook of remoteBooks) {
        const localBook = localBooks.find((b) => b.id === remoteBook.id);
        if (!localBook) {
          await localDB.books.add(remoteBook);
        }
      }

      await get().fetchBooks();
    } catch (error) {
      console.error('Sync failed:', error);
    }
  },
}));
