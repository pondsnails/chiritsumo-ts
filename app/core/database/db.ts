import { supabase } from './supabase';
import type { Book, Card, LedgerEntry, InventoryPreset } from '../types';

const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001';

export async function initializeDatabase() {
  console.log('Using Supabase for data persistence');
}

export const booksDB = {
  getAll: async (): Promise<Book[]> => {
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((row) => ({
      id: row.id,
      subjectId: row.subject_id || 0,
      title: row.title,
      isbn: row.isbn || '',
      mode: row.mode as 0 | 1 | 2,
      totalUnit: row.total_unit,
      completedUnit: row.completed_unit,
      status: row.status as 0 | 1 | 2,
      previousBookId: row.previous_book_id || null,
      priority: row.priority as 0 | 1,
      coverPath: row.cover_path || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },

  getById: async (id: string): Promise<Book | null> => {
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      id: data.id,
      subjectId: data.subject_id || 0,
      title: data.title,
      isbn: data.isbn || '',
      mode: data.mode as 0 | 1 | 2,
      totalUnit: data.total_unit,
      completedUnit: data.completed_unit,
      status: data.status as 0 | 1 | 2,
      previousBookId: data.previous_book_id || null,
      priority: data.priority as 0 | 1,
      coverPath: data.cover_path || null,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  add: async (book: Omit<Book, 'createdAt' | 'updatedAt'>): Promise<void> => {
    const { error } = await supabase.from('books').insert({
      id: book.id,
      user_id: DEFAULT_USER_ID,
      subject_id: book.subjectId,
      title: book.title,
      isbn: book.isbn,
      mode: book.mode,
      total_unit: book.totalUnit,
      completed_unit: book.completedUnit,
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
    if (updates.completedUnit !== undefined) updateData.completed_unit = updates.completedUnit;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.priority !== undefined) updateData.priority = updates.priority;
    if (updates.previousBookId !== undefined) updateData.previous_book_id = updates.previousBookId;
    if (updates.coverPath !== undefined) updateData.cover_path = updates.coverPath;

    const { error } = await supabase.from('books').update(updateData).eq('id', id);

    if (error) throw error;
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('books').delete().eq('id', id);
    if (error) throw error;
  },
};

export const cardsDB = {
  getByBookId: async (bookId: string): Promise<Card[]> => {
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .eq('book_id', bookId)
      .order('unit_index', { ascending: true });

    if (error) throw error;

    return (data || []).map((row) => ({
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
    }));
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

    return (data || []).map((row) => ({
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
    }));
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
      last_review: card.lastReview?.toISOString() || null,
      reps: card.reps,
      photo_path: card.photoPath,
    });

    if (error) throw error;
  },

  bulkUpsert: async (cards: Card[]): Promise<void> => {
    const { error } = await supabase.from('cards').upsert(
      cards.map((card) => ({
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
      }))
    );

    if (error) throw error;
  },
};

export const ledgerDB = {
  getRecent: async (limit: number = 30): Promise<LedgerEntry[]> => {
    const { data, error } = await supabase
      .from('ledger')
      .select('*')
      .eq('user_id', DEFAULT_USER_ID)
      .order('date', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map((row) => ({
      id: row.id,
      date: row.date,
      earnedLex: row.earned_lex,
      targetLex: row.target_lex,
      balance: row.balance,
    }));
  },

  upsert: async (entry: Omit<LedgerEntry, 'id'>): Promise<void> => {
    const { error } = await supabase.from('ledger').upsert({
      user_id: DEFAULT_USER_ID,
      date: entry.date,
      earned_lex: entry.earnedLex,
      target_lex: entry.targetLex,
      balance: entry.balance,
    });

    if (error) throw error;
  },
};

export const inventoryPresetsDB = {
  getAll: async (): Promise<InventoryPreset[]> => {
    const { data, error } = await supabase
      .from('inventory_presets')
      .select('*')
      .eq('user_id', DEFAULT_USER_ID);

    if (error) throw error;

    return (data || []).map((row) => ({
      id: row.id,
      label: row.label,
      iconCode: row.icon_code,
      bookIds: row.book_ids || [],
      isDefault: row.is_default,
    }));
  },

  add: async (preset: Omit<InventoryPreset, 'id'>): Promise<number> => {
    const { data, error } = await supabase
      .from('inventory_presets')
      .insert({
        user_id: DEFAULT_USER_ID,
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
    const updateData: any = {};
    if (updates.label !== undefined) updateData.label = updates.label;
    if (updates.iconCode !== undefined) updateData.icon_code = updates.iconCode;
    if (updates.bookIds !== undefined) updateData.book_ids = updates.bookIds;
    if (updates.isDefault !== undefined) updateData.is_default = updates.isDefault;

    const { error } = await supabase.from('inventory_presets').update(updateData).eq('id', id);

    if (error) throw error;
  },

  delete: async (id: number): Promise<void> => {
    const { error } = await supabase.from('inventory_presets').delete().eq('id', id);
    if (error) throw error;
  },
};
