import { z } from 'zod';
import { Book, Card, Ledger, SystemSetting, PresetBookRow } from './schema';

// Book adapter (DB row -> domain normalized)
export const BookRowSchema = z.object({
  id: z.string(),
  title: z.string(),
  user_id: z.string().optional(),
  subject_id: z.number().int().nullable().optional(),
  isbn: z.string().nullable().optional(),
  mode: z.number().int().optional(),
  total_unit: z.number().int().optional(),
  chunk_size: z.number().int().optional(),
  completed_unit: z.number().int().optional(),
  status: z.number().int().optional(),
  previous_book_id: z.string().nullable().optional(),
  priority: z.number().int().optional(),
  cover_path: z.string().nullable().optional(),
  target_completion_date: z.number().int().nullable().optional(),
  created_at: z.number().int().optional(),
  updated_at: z.number().int().optional(),
}).transform(r => ({
  id: r.id,
  title: r.title,
  userId: r.user_id ?? 'local-user',
  subjectId: r.subject_id ?? null,
  isbn: r.isbn ?? null,
  mode: r.mode ?? 1,
  totalUnit: r.total_unit ?? 0,
  chunkSize: r.chunk_size ?? 1,
  completedUnit: r.completed_unit ?? 0,
  status: r.status ?? 0,
  previousBookId: r.previous_book_id ?? null,
  priority: r.priority ?? 1,
  coverPath: r.cover_path ?? null,
  targetCompletionDate: r.target_completion_date ?? null,
  createdAt: r.created_at ?? Math.floor(Date.now()/1000),
  updatedAt: r.updated_at ?? r.created_at ?? Math.floor(Date.now()/1000),
}));

export type NormalizedBook = z.infer<typeof BookRowSchema>;

export const CardRowSchema = z.object({
  id: z.string(),
  book_id: z.string(),
  unit_index: z.number().int().optional(),
  state: z.number().int().optional(),
  stability: z.number().optional(),
  difficulty: z.number().optional(),
  elapsed_days: z.number().int().optional(),
  scheduled_days: z.number().int().optional(),
  reps: z.number().int().optional(),
  lapses: z.number().int().optional(),
  due: z.number().int().optional(),
  last_review: z.number().int().nullable().optional(),
  photo_path: z.string().nullable().optional(),
}).transform(c => ({
  id: c.id,
  bookId: c.book_id,
  unitIndex: c.unit_index ?? 0,
  state: c.state ?? 0,
  stability: c.stability ?? 0,
  difficulty: c.difficulty ?? 0,
  elapsedDays: c.elapsed_days ?? 0,
  scheduledDays: c.scheduled_days ?? 0,
  reps: c.reps ?? 0,
  lapses: c.lapses ?? 0,
  due: c.due ?? Math.floor(Date.now()/1000),
  lastReview: c.last_review ?? null,
  photoPath: c.photo_path ?? null,
}));

export type NormalizedCard = z.infer<typeof CardRowSchema>;

export const LedgerRowSchema = z.object({
  date: z.number().int(),
  earned_lex: z.number().int().optional(),
  target_lex: z.number().int().optional(),
  balance: z.number().int().optional(),
}).transform(l => ({
  date: l.date,
  earnedLex: l.earned_lex ?? 0,
  targetLex: l.target_lex ?? 0,
  balance: l.balance ?? 0,
}));
export type NormalizedLedger = z.infer<typeof LedgerRowSchema>;

export const SystemSettingRowSchema = z.object({
  key: z.string(),
  value: z.string(),
  updated_at: z.string().optional(),
});
export type NormalizedSystemSetting = z.infer<typeof SystemSettingRowSchema>;

export const PresetBookRowSchema = z.object({
  id: z.number().int().optional(),
  preset_id: z.number().int(),
  book_id: z.string(),
});
export type NormalizedPresetBookLink = z.infer<typeof PresetBookRowSchema>;

// Bulk parse helpers
export function parseBooks(rows: Book[]): NormalizedBook[] {
  return rows.map(r => BookRowSchema.parse(r));
}
export function parseCards(rows: Card[]): NormalizedCard[] {
  return rows.map(r => CardRowSchema.parse(r));
}
export function parseLedger(rows: Ledger[]): NormalizedLedger[] {
  return rows.map(r => LedgerRowSchema.parse(r));
}
export function parseSettings(rows: SystemSetting[]): NormalizedSystemSetting[] {
  return rows.map(r => SystemSettingRowSchema.parse(r));
}
export function parsePresetLinks(rows: PresetBookRow[]): NormalizedPresetBookLink[] {
  return rows.map(r => PresetBookRowSchema.parse(r));
}
