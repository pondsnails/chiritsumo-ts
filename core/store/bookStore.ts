import { create } from 'zustand';
import { DrizzleBookRepository, type IBookRepository } from '../repository/BookRepository';
import type { Book } from '../types';

interface BookState {
  books: Book[];
  isLoading: boolean;
  error: string | null;
  fetchBooks: () => Promise<void>;
  addBook: (book: Book) => Promise<void>;
  updateBook: (id: string, updates: Partial<Book>) => Promise<void>;
  deleteBook: (id: string) => Promise<void>;
  resetStore: () => void;
}

/**
 * DI対応のStoreファクトリー
 * テスト時はモックRepositoryを注入可能
 */
export function createBookStore(bookRepo: IBookRepository) {
  return create<BookState>((set, get) => ({
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
        // Book作成と同時にCard生成（トランザクション内で一括処理）
        await bookRepo.createWithCards(book);
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

    resetStore: () => {
      set({ books: [], isLoading: false, error: null });
    },
  }));
}

// デフォルトインスタンス（本番用）
const defaultBookRepo = new DrizzleBookRepository();
export const useBookStore = createBookStore(defaultBookRepo);
