import { create } from 'zustand';
import { DrizzleBookRepository } from '../repository/BookRepository';
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

const bookRepo = new DrizzleBookRepository();

export const useBookStore = create<BookState>((set, get) => ({
  books: [],
  isLoading: false,
  error: null,

  fetchBooks: async () => {
    try {
      set({ isLoading: true, error: null });
      const books = await bookRepo.findAll();
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
      await bookRepo.create(book);
      await get().fetchBooks();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add book';
      set({ error: message });
      throw error;
    }
  },

  updateBook: async (id: string, updates: Partial<Book>) => {
    try {
      await bookRepo.update(id, updates);
      await get().fetchBooks();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update book';
      set({ error: message });
      throw error;
    }
  },

  deleteBook: async (id: string) => {
    try {
      await bookRepo.delete(id);
      await get().fetchBooks();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete book';
      set({ error: message });
      throw error;
    }
  },
}));
