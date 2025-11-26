import { supabase } from './supabase';
import type { Book, Card, LedgerEntry, InventoryPreset } from '../types';

export async function initializeDatabase() {
  console.log('Using Supabase for web platform');
}

export const booksDB = {
  getAll: async (): Promise<Book[]> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(book => ({
        id: book.id,
        userId: book.user_id,
        subjectId: book.subject_id,
        title: book.title,
        isbn: book.isbn,
        mode: book.mode,
        totalUnit: book.total_unit,
        completedUnit: book.completed_unit || 0,
        status: book.status,
        previousBookId: book.previous_book_id,
        priority: book.priority,
        coverPath: book.cover_path,
        createdAt: book.created_at,
        updatedAt: book.updated_at,
      }));
    } catch (error) {
      console.error('Failed to get books:', error);
      return [];
    }
  },

  getById: async (id: string): Promise<Book | null> => {
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        userId: data.user_id,
        subjectId: data.subject_id,
        title: data.title,
        isbn: data.isbn,
        mode: data.mode,
        totalUnit: data.total_unit,
        completedUnit: data.completed_unit || 0,
        status: data.status,
        previousBookId: data.previous_book_id,
        priority: data.priority,
        coverPath: data.cover_path,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      console.error('Failed to get book:', error);
      return null;
    }
  },

  add: async (book: Book): Promise<void> => {
    const { error } = await supabase.from('books').insert({
      id: book.id,
      user_id: book.userId,
      subject_id: book.subjectId || null,
      title: book.title,
      isbn: book.isbn || null,
      mode: book.mode,
      total_unit: book.totalUnit,
      completed_unit: book.completedUnit || 0,
      status: book.status,
      previous_book_id: book.previousBookId,
      priority: book.priority || 0,
      cover_path: book.coverPath || null,
      created_at: book.createdAt,
      updated_at: book.updatedAt,
    });

    if (error) throw error;
  },

  update: async (id: string, updates: Partial<Book>): Promise<void> => {
    const dbUpdates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.mode !== undefined) dbUpdates.mode = updates.mode;
    if (updates.totalUnit !== undefined) dbUpdates.total_unit = updates.totalUnit;
    if (updates.completedUnit !== undefined) dbUpdates.completed_unit = updates.completedUnit;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.previousBookId !== undefined) dbUpdates.previous_book_id = updates.previousBookId;
    if (updates.subjectId !== undefined) dbUpdates.subject_id = updates.subjectId;
    if (updates.isbn !== undefined) dbUpdates.isbn = updates.isbn;
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
    if (updates.coverPath !== undefined) dbUpdates.cover_path = updates.coverPath;

    const { error } = await supabase
      .from('books')
      .update(dbUpdates)
      .eq('id', id);

    if (error) throw error;
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('books')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

export const cardsDB = {
  getByBookId: async (bookId: string): Promise<Card[]> => {
    try {
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .eq('book_id', bookId)
        .order('unit_index', { ascending: true });

      if (error) throw error;

      return (data || []).map(card => ({
        id: card.id,
        bookId: card.book_id,
        unitIndex: card.unit_index,
        state: card.state,
        stability: card.stability,
        difficulty: card.difficulty,
        due: new Date(card.due),
        lastReview: card.last_review ? new Date(card.last_review) : null,
        reps: card.reps,
        photoPath: card.photo_path,
      }));
    } catch (error) {
      console.error('Failed to get cards:', error);
      return [];
    }
  },

  getDueCards: async (bookIds: string[]): Promise<Card[]> => {
    try {
      if (bookIds.length === 0) return [];

      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .in('book_id', bookIds)
        .lte('due', now)
        .order('due', { ascending: true });

      if (error) throw error;

      return (data || []).map(card => ({
        id: card.id,
        bookId: card.book_id,
        unitIndex: card.unit_index,
        state: card.state,
        stability: card.stability,
        difficulty: card.difficulty,
        due: new Date(card.due),
        lastReview: card.last_review ? new Date(card.last_review) : null,
        reps: card.reps,
        photoPath: card.photo_path,
      }));
    } catch (error) {
      console.error('Failed to get due cards:', error);
      return [];
    }
  },

  upsert: async (card: Card): Promise<void> => {
    const { error } = await supabase.from('cards').upsert({
      id: card.id,
      book_id: card.bookId,
      unit_index: card.unitIndex,
      state: card.state,
      stability: card.stability,
      difficulty: card.difficulty,
      due: card.due.toISOString(),
      last_review: card.lastReview ? card.lastReview.toISOString() : null,
      reps: card.reps,
      photo_path: card.photoPath,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;
  },

  bulkUpsert: async (cards: Card[]): Promise<void> => {
    const dbCards = cards.map(card => ({
      id: card.id,
      book_id: card.bookId,
      unit_index: card.unitIndex,
      state: card.state,
      stability: card.stability,
      difficulty: card.difficulty,
      due: card.due.toISOString(),
      last_review: card.lastReview ? card.lastReview.toISOString() : null,
      reps: card.reps,
      photo_path: card.photoPath,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from('cards').upsert(dbCards);

    if (error) throw error;
  },
};

export const ledgerDB = {
  getRecent: async (limit: number = 30): Promise<LedgerEntry[]> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('ledger')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map(entry => ({
        id: entry.id,
        date: entry.date,
        earnedLex: entry.earned_lex,
        targetLex: entry.target_lex,
        balance: entry.balance,
      }));
    } catch (error) {
      console.error('Failed to get ledger:', error);
      return [];
    }
  },

  upsert: async (entry: Omit<LedgerEntry, 'id'>): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase.from('ledger').upsert({
      user_id: user.id,
      date: entry.date,
      earned_lex: entry.earnedLex,
      target_lex: entry.targetLex,
      balance: entry.balance,
    }, {
      onConflict: 'user_id,date',
    });

    if (error) throw error;
  },
};

export const inventoryPresetsDB = {
  getAll: async (): Promise<InventoryPreset[]> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('inventory_presets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map(preset => ({
        id: preset.id,
        label: preset.label,
        iconCode: preset.icon_code,
        bookIds: Array.isArray(preset.book_ids) ? preset.book_ids : [],
        isDefault: preset.is_default,
      }));
    } catch (error) {
      console.error('Failed to get presets:', error);
      return [];
    }
  },

  add: async (preset: Omit<InventoryPreset, 'id'>): Promise<number> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('inventory_presets')
      .insert({
        user_id: user.id,
        label: preset.label,
        icon_code: preset.iconCode,
        book_ids: preset.bookIds,
        is_default: preset.isDefault,
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  },

  update: async (id: number, updates: Partial<InventoryPreset>): Promise<void> => {
    const dbUpdates: Record<string, unknown> = {};

    if (updates.label !== undefined) dbUpdates.label = updates.label;
    if (updates.iconCode !== undefined) dbUpdates.icon_code = updates.iconCode;
    if (updates.bookIds !== undefined) dbUpdates.book_ids = updates.bookIds;
    if (updates.isDefault !== undefined) dbUpdates.is_default = updates.isDefault;

    const { error } = await supabase
      .from('inventory_presets')
      .update(dbUpdates)
      .eq('id', id);

    if (error) throw error;
  },

  delete: async (id: number): Promise<void> => {
    const { error } = await supabase
      .from('inventory_presets')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
