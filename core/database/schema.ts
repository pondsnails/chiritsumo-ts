import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ---------------------------------------------------------
// 3.1 books (参考書マスタ)
// ---------------------------------------------------------
export const books = sqliteTable('books', {
  id: text('id').primaryKey(), // UUID
  title: text('title').notNull(),
  mode: integer('mode').notNull().default(1), // 0=Read, 1=Solve, 2=Memo
  total_unit: integer('total_unit').notNull(), // 総ページ数/総問題数
  chunk_size: integer('chunk_size').notNull().default(1), // [New] 1カードあたりの学習量
  status: integer('status').notNull().default(0), // 0=Active, 1=Completed, 2=Frozen
  previous_book_id: text('previous_book_id'), // 親となるBook ID (ルート描画用)
  priority: integer('priority').notNull().default(1), // 0=Branch, 1=MainLine
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
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
  id: text('id').primaryKey(),
  date: text('date').notNull(), // YYYY-MM-DD
  earned_lex: integer('earned_lex').notNull().default(0), // 獲得実績
  target_lex: integer('target_lex').notNull().default(0), // 当日の目標
  balance: integer('balance').notNull().default(0), // 累積残高 (プラス=貯蓄, マイナス=借金)
  transaction_type: text('transaction_type').default('daily'), // daily, item_purchase, adjustment
  note: text('note'),
});

// Types Export
export type Book = typeof books.$inferSelect;
export type NewBook = typeof books.$inferInsert;
export type Card = typeof cards.$inferSelect;
export type Ledger = typeof ledger.$inferSelect;