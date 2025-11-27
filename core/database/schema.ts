import { sqliteTable, text, integer, real, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ---------------------------------------------------------
// 3.1 books (参考書マスタ)
// ---------------------------------------------------------
export const books = sqliteTable('books', {
  id: text('id').primaryKey(), // UUID
  user_id: text('user_id').notNull().default('local-user'),
  subject_id: integer('subject_id'),
  title: text('title').notNull(),
  isbn: text('isbn'),
  mode: integer('mode').notNull().default(1), // 0=Read, 1=Solve, 2=Memo
  total_unit: integer('total_unit').notNull(), // 総ページ数/総問題数
  chunk_size: integer('chunk_size').notNull().default(1), // [New]
  completed_unit: integer('completed_unit').notNull().default(0),
  status: integer('status').notNull().default(0), // 0=Active, 1=Completed, 2=Frozen
  previous_book_id: text('previous_book_id'), // 親Book ID
  priority: integer('priority').notNull().default(1), // 0=Branch, 1=MainLine
  cover_path: text('cover_path'),
  target_completion_date: text('target_completion_date'),
  created_at: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

// ---------------------------------------------------------
// 3.2 cards (学習カード・FSRSステータス)
// ---------------------------------------------------------
export const cards = sqliteTable('cards', {
  id: text('id').primaryKey(), // Format: ${bookId}_${unitIndex}
  book_id: text('book_id').notNull().references(() => books.id, { onDelete: 'cascade' }),
  unit_index: integer('unit_index').notNull(), // 並び順 (1, 2, 3...)
  state: integer('state').notNull().default(0), // 0=New, 1=Learning, 2=Review, 3=Relearning
  
  // FSRS v5 Parameters
  stability: real('stability').notNull().default(0),
  difficulty: real('difficulty').notNull().default(0),
  elapsed_days: integer('elapsed_days').notNull().default(0),
  scheduled_days: integer('scheduled_days').notNull().default(0),
  reps: integer('reps').notNull().default(0),
  lapses: integer('lapses').notNull().default(0),
  
  due: text('due').notNull().default(sql`CURRENT_TIMESTAMP`), // 次回復習日時 (ISO8601)
  last_review: text('last_review'), // 前回の復習日時
  
  photo_path: text('photo_path'), // 失敗時の写真メモ (Local File URI)
});

// ---------------------------------------------------------
// 3.3 ledger (読書銀行・取引履歴)
// ---------------------------------------------------------
export const ledger = sqliteTable('ledger', {
  id: integer('id').primaryKey(),
  date: text('date').notNull(), // YYYY-MM-DD (UNIQUE)
  earned_lex: integer('earned_lex').notNull().default(0),
  target_lex: integer('target_lex').notNull().default(0),
  balance: integer('balance').notNull().default(0),
  transaction_type: text('transaction_type').default('daily'),
  note: text('note'),
}, (t) => ({
  dateUnique: uniqueIndex('ledger_date_unique').on(t.date),
}));

// ---------------------------------------------------------
// 3.4 inventory_presets (蔵書フィルタプリセット)
// ---------------------------------------------------------
export const inventoryPresets = sqliteTable('inventory_presets', {
  id: integer('id').primaryKey(),
  label: text('label').notNull(),
  icon_code: integer('icon_code').notNull().default(0),
  is_default: integer('is_default').notNull().default(0),
});

// ---------------------------------------------------------
// 3.4.1 preset_books (プリセット-書籍 中間テーブル)
// ---------------------------------------------------------
export const presetBooks = sqliteTable('preset_books', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  preset_id: integer('preset_id').notNull().references(() => inventoryPresets.id, { onDelete: 'cascade' }),
  book_id: text('book_id').notNull().references(() => books.id, { onDelete: 'cascade' }),
});

// ---------------------------------------------------------
// 3.5 system_settings (システム設定・キーバリューストア)
// ---------------------------------------------------------
export const systemSettings = sqliteTable('system_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updated_at: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

// ---------------------------------------------------------
// 3.6 velocity_measurements (学習速度計測データ)
// ---------------------------------------------------------
export const velocityMeasurements = sqliteTable('velocity_measurements', {
  date: text('date').primaryKey(), // YYYY-MM-DD
  earned_lex: integer('earned_lex').notNull().default(0),
  minutes_spent: integer('minutes_spent').notNull().default(0), // 学習時間（分）
  created_at: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Types Export
export type Book = typeof books.$inferSelect;
export type NewBook = typeof books.$inferInsert;
export type Card = typeof cards.$inferSelect;
export type Ledger = typeof ledger.$inferSelect;
export type InventoryPresetRow = typeof inventoryPresets.$inferSelect;
export type PresetBookRow = typeof presetBooks.$inferSelect;
export type SystemSetting = typeof systemSettings.$inferSelect;
export type VelocityMeasurement = typeof velocityMeasurements.$inferSelect;
export type NewVelocityMeasurement = typeof velocityMeasurements.$inferInsert;