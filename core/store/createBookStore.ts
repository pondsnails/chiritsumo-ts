import { create } from 'zustand';
import type { IBookRepository } from '../repository/BookRepository';
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
 * BookStore Factory with Dependency Injection
 * 
 * Repository を Store 初期化時に注入し、Store 内部で保持する。
 * これにより、コンポーネントは Repository の存在を意識する必要がなくなる。
 * 
 * 使用例:
 *   const bookStore = createBookStore(bookRepo);
 *   export const useBookStore = bookStore;
 * 
 * コンポーネント側:
 *   const { books, fetchBooks } = useBookStore();
 *   useEffect(() => { fetchBooks(); }, []); // repo を渡す必要なし
 */
export const createBookStore = (repository: IBookRepository) => {
  return create<BookState>((set, get) => ({
    books: [],
    isLoading: false,
    error: null,

    fetchBooks: async () => {
      try {
        set({ isLoading: true, error: null });
        const books = await repository.findAll();
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
        await repository.createWithCards(book);
        await get().fetchBooks();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to add book';
        set({ error: message });
        throw error;
      }
    },

    updateBook: async (id: string, updates: Partial<Book>) => {
      try {
        await repository.update(id, updates);
        await get().fetchBooks();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update book';
        set({ error: message });
        throw error;
      }
    },

    deleteBook: async (id: string) => {
      try {
        await repository.delete(id);
        set({ books: get().books.filter((b) => b.id !== id) });
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
};
