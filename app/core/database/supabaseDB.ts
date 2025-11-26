import { supabase } from './supabase';
import type { Book, Card, LedgerEntry } from '../types';

export class SupabaseDB {
  books = {
    getAll: async (userId: string): Promise<Book[]> => {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (
        data?.map((row) => ({
          id: row.id,
          subjectId: row.subject_id || 0,
          title: row.title,
          isbn: row.isbn || '',
          mode: row.mode as 0 | 1 | 2,
          totalUnit: row.total_unit,
          completedUnit: 0,
          status: row.status as 0 | 1 | 2,
          previousBookId: row.previous_book_id || null,
          priority: row.priority as 0 | 1,
          coverPath: row.cover_path || null,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })) || []
      );
    },

    add: async (userId: string, book: Book): Promise<void> => {
      const { error } = await supabase.from('books').insert({
        id: book.id,
        user_id: userId,
        subject_id: book.subjectId,
        title: book.title,
        isbn: book.isbn,
        mode: book.mode,
        total_unit: book.totalUnit,
        status: book.status,
        previous_book_id: book.previousBookId,
        priority: book.priority,
        cover_path: book.coverPath,
      });

      if (error) throw error;
    },

    update: async (id: string, updates: Partial<Book>): Promise<void> => {
      const updateData: any = {};
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.mode !== undefined) updateData.mode = updates.mode;
      if (updates.totalUnit !== undefined) updateData.total_unit = updates.totalUnit;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.priority !== undefined) updateData.priority = updates.priority;
      if (updates.previousBookId !== undefined)
        updateData.previous_book_id = updates.previousBookId;

      updateData.updated_at = new Date().toISOString();

      const { error } = await supabase.from('books').update(updateData).eq('id', id);

      if (error) throw error;
    },

    delete: async (id: string): Promise<void> => {
      const { error } = await supabase.from('books').delete().eq('id', id);

      if (error) throw error;
    },
  };

  cards = {
    getByBookId: async (bookId: string): Promise<Card[]> => {
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .eq('book_id', bookId)
        .order('unit_index', { ascending: true });

      if (error) throw error;

      return (
        data?.map((row) => ({
          id: row.id,
          bookId: row.book_id,
          unitIndex: row.unit_index,
          state: row.state as 0 | 1 | 2 | 3,
          stability: row.stability,
          difficulty: row.difficulty,
          due: new Date(row.due),
          lastReview: row.last_review ? new Date(row.last_review) : null,
          reps: row.reps,
          photoPath: row.photo_path || null,
        })) || []
      );
    },

    getDueCards: async (bookIds: string[]): Promise<Card[]> => {
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .in('book_id', bookIds)
        .lte('due', now)
        .order('due', { ascending: true });

      if (error) throw error;

      return (
        data?.map((row) => ({
          id: row.id,
          bookId: row.book_id,
          unitIndex: row.unit_index,
          state: row.state as 0 | 1 | 2 | 3,
          stability: row.stability,
          difficulty: row.difficulty,
          due: new Date(row.due),
          lastReview: row.last_review ? new Date(row.last_review) : null,
          reps: row.reps,
          photoPath: row.photo_path || null,
        })) || []
      );
    },

    upsert: async (card: Card): Promise<void> => {
      const { error } = await supabase.from('cards').upsert(
        {
          id: card.id,
          book_id: card.bookId,
          unit_index: card.unitIndex,
          state: card.state,
          stability: card.stability,
          difficulty: card.difficulty,
          due: card.due.toISOString(),
          last_review: card.lastReview?.toISOString() || null,
          reps: card.reps,
          photo_path: card.photoPath,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

      if (error) throw error;
    },

    bulkUpsert: async (cards: Card[]): Promise<void> => {
      const cardData = cards.map((card) => ({
        id: card.id,
        book_id: card.bookId,
        unit_index: card.unitIndex,
        state: card.state,
        stability: card.stability,
        difficulty: card.difficulty,
        due: card.due.toISOString(),
        last_review: card.lastReview?.toISOString() || null,
        reps: card.reps,
        photo_path: card.photoPath,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from('cards').upsert(cardData, { onConflict: 'id' });

      if (error) throw error;
    },
  };

  ledger = {
    getRecent: async (userId: string, limit: number = 30): Promise<LedgerEntry[]> => {
      const { data, error } = await supabase
        .from('ledger')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (
        data?.map((row) => ({
          id: row.id,
          date: row.date,
          earnedLex: row.earned_lex,
          targetLex: row.target_lex,
          balance: row.balance,
        })) || []
      );
    },

    upsert: async (userId: string, entry: Omit<LedgerEntry, 'id'>): Promise<void> => {
      const { error } = await supabase.from('ledger').upsert(
        {
          user_id: userId,
          date: entry.date,
          earned_lex: entry.earnedLex,
          target_lex: entry.targetLex,
          balance: entry.balance,
        },
        { onConflict: 'user_id,date' }
      );

      if (error) throw error;
    },
  };
}

export const supabaseDB = new SupabaseDB();
