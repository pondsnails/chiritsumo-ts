import { create } from 'zustand';
import type { IBookRepository } from '../repository/BookRepository';
import type { Book } from '../types';

interface BookState {
  books: Book[];
  isLoading: boolean;
  error: string | null;
  fetchBooks: (repo: IBookRepository) => Promise<void>;
  addBook: (repo: IBookRepository, book: Book) => Promise<void>;
  updateBook: (repo: IBookRepository, id: string, updates: Partial<Book>) => Promise<void>;
  deleteBook: (repo: IBookRepository, id: string) => Promise<void>;
  resetStore: () => void;
}

/**
 * Zustand Singleton Store (Repository を関数引数で受け取るパターン)
 * 
 * 問題のあった設計:
 * - useMemo(() => createBookStore(repo)) で毎回新しいストアを作成
 * - Repository インスタンスが変わるとストアが再生成され、状態が消失
 * 
 * 修正後:
 * - ストアはシングルトン（1つだけ存在）
 * - Repository は関数の引数として注入
 * - コンポーネントから useBookStore().fetchBooks(repo) のように呼ぶ
 */
export const useBookStore = create<BookState>((set, get) => ({
  books: [],
  isLoading: false,
  error: null,

  fetchBooks: async (repo: IBookRepository) => {
    try {
      set({ isLoading: true, error: null });
      const books = await repo.findAll();
      set({ books });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch books';
      set({ error: message });
    } finally {
      set({ isLoading: false });
    }
  },

  addBook: async (repo: IBookRepository, book: Book) => {
    try {
      await repo.createWithCards(book);
      await get().fetchBooks(repo);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add book';
      set({ error: message });
      throw error;
    }
  },

  updateBook: async (repo: IBookRepository, id: string, updates: Partial<Book>) => {
    try {
      await repo.update(id, updates);
      await get().fetchBooks(repo);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update book';
      set({ error: message });
      throw error;
    }
  },

  deleteBook: async (repo: IBookRepository, id: string) => {
    try {
      await repo.delete(id);
      await get().fetchBooks(repo);
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
