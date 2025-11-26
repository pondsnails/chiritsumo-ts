import { create } from 'zustand';
import { booksDB } from '../database/db';
import type { Book } from '../types';

interface BookState {
  books: Book[];
  isLoading: boolean;
  error: string | null;
  fetchBooks: () => Promise<void>;
  addBook: (book: Book) => Promise<void>;
  updateBook: (id: string, updates: Partial<Book>) => Promise<void>;
  deleteBook: (id: string) => Promise<void>;
}

export const useBookStore = create<BookState>((set, get) => ({
  books: [],
  isLoading: false,
  error: null,

  fetchBooks: async () => {
    try {
      set({ isLoading: true, error: null });
      const books = await booksDB.getAll();
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
      await booksDB.add(book);
      await get().fetchBooks();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add book';
      set({ error: message });
      throw error;
    }
  },

  updateBook: async (id: string, updates: Partial<Book>) => {
    try {
      await booksDB.update(id, updates);
      await get().fetchBooks();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update book';
      set({ error: message });
      throw error;
    }
  },

  deleteBook: async (id: string) => {
    try {
      await booksDB.delete(id);
      await get().fetchBooks();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete book';
      set({ error: message });
      throw error;
    }
  },
}));
