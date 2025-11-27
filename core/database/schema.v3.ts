/**
 * schema.v3.ts
 * スキーマ改善版（時限爆弾除去）- **参考実装**
 * 
 * ⚠️ 注意: これは将来的なマイグレーション用の設計案です
 * Drizzle-ORM (SQLite) は autoIncrement をサポートしていないため、
 * 実装には生SQLを使用する必要があります。
 * 
 * 変更点:
 * 1. ID型をinteger化（UUIDは外部連携用に残す）
 * 2. 日付型をUTC Unix Timestamp化（YYYY-MM-DD文字列主キー廃止）
 * 3. Enum値の型安全化（マジックナンバー撲滅）
 * 4. インデックス最適化
 * 
 * このファイルは今後のマイグレーション計画の参考として保持します。
 */

import { BookMode, BookStatus, BookPriority, CardState, FSRSGrade } from '../constants/enums';

/**
 * 書籍テーブルの型定義 (v3)
 */
export interface BookV3Schema {
  id: number; // INTEGER PRIMARY KEY AUTOINCREMENT
  uuid?: string | null; // 外部連携用UUID
  title: string;
  author?: string | null;
  publisher?: string | null;
  isbn?: string | null;
  photoPath?: string | null;
  mode: BookMode; // 0: READ, 1: SOLVE, 2: MEMO
  status: BookStatus; // 0: ACTIVE, 1: COMPLETED, 2: FROZEN
  priority: BookPriority; // 0: NORMAL, 1: HIGH
  chunkSize: number;
  totalChunks: number;
  dailyNewLexTarget: number;
  createdAt: number; // Unix Timestamp
  updatedAt: number; // Unix Timestamp
  completedAt?: number | null;
  frozenAt?: number | null;
  tags?: string | null; // カンマ区切り
  notes?: string | null;
}

/**
 * カードテーブルの型定義 (v3)
 */
export interface CardV3Schema {
  id: number; // INTEGER PRIMARY KEY AUTOINCREMENT
  uuid?: string | null;
  bookId: number; // INTEGER FOREIGN KEY
  state: CardState; // 0: NEW, 1: LEARNING, 2: REVIEW, 3: RELEARNING
  chunkStart: number;
  chunkEnd: number;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  due: number; // Unix Timestamp
  lastReview?: number | null; // Unix Timestamp
  createdAt: number; // Unix Timestamp
  updatedAt: number; // Unix Timestamp
}

/**
 * 台帳テーブルの型定義 (v3)
 */
export interface LedgerV3Schema {
  id: number; // INTEGER PRIMARY KEY AUTOINCREMENT
  dayStartTimestamp: number; // ローカル日付の開始時刻（UNIQUE）
  newLex: number;
  reviewLex: number;
  combinedLex: number;
  newCardsStudied: number;
  reviewCardsStudied: number;
  createdAt: number; // Unix Timestamp
  updatedAt: number; // Unix Timestamp
}

/**
 * 学習ログテーブルの型定義 (v3)
 */
export interface ReviewLogV3Schema {
  id: number; // INTEGER PRIMARY KEY AUTOINCREMENT
  cardId: number; // INTEGER FOREIGN KEY
  grade: FSRSGrade; // 1: AGAIN, 2: HARD, 3: GOOD, 4: EASY
  stateBefore: CardState;
  stateAfter: CardState;
  stabilityBefore?: number | null;
  stabilityAfter?: number | null;
  difficultyBefore?: number | null;
  difficultyAfter?: number | null;
  reviewedAt: number; // Unix Timestamp
  createdAt: number; // Unix Timestamp
}

/**
 * システム設定テーブルの型定義 (v3)
 */
export interface SystemSettingV3Schema {
  key: string; // PRIMARY KEY
  value: string;
  description?: string | null;
  dataType?: 'number' | 'string' | 'boolean' | 'json' | null;
  updatedAt: number; // Unix Timestamp
}

/**
 * インベントリプリセットテーブルの型定義 (v3)
 */
export interface InventoryPresetV3Schema {
  id: number; // INTEGER PRIMARY KEY AUTOINCREMENT
  name: string;
  bookIds: string; // カンマ区切りのinteger ID（例: "1,3,5"）
  isDefault: boolean; // 0 or 1
  createdAt: number; // Unix Timestamp
  updatedAt: number; // Unix Timestamp
}

/**
 * Velocity測定テーブルの型定義 (v3)
 */
export interface VelocityMeasurementV3Schema {
  id: number; // INTEGER PRIMARY KEY AUTOINCREMENT
  dayStartTimestamp: number; // 計測日のタイムスタンプ（UNIQUE）
  bookId: number; // INTEGER FOREIGN KEY
  avgSecondsPerChunk: number;
  sampleSize: number;
  createdAt: number; // Unix Timestamp
  updatedAt: number; // Unix Timestamp
}

/**
 * マイグレーション用SQL（参考）
 * 
 * -- 書籍テーブル
 * CREATE TABLE books_v3 (
 *   id INTEGER PRIMARY KEY AUTOINCREMENT,
 *   uuid TEXT UNIQUE,
 *   title TEXT NOT NULL,
 *   author TEXT,
 *   publisher TEXT,
 *   isbn TEXT,
 *   photo_path TEXT,
 *   mode INTEGER NOT NULL DEFAULT 0,
 *   status INTEGER NOT NULL DEFAULT 0,
 *   priority INTEGER NOT NULL DEFAULT 0,
 *   chunk_size INTEGER NOT NULL DEFAULT 3,
 *   total_chunks INTEGER NOT NULL DEFAULT 0,
 *   daily_new_lex_target INTEGER NOT NULL DEFAULT 0,
 *   created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
 *   updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
 *   completed_at INTEGER,
 *   frozen_at INTEGER,
 *   tags TEXT,
 *   notes TEXT
 * );
 * CREATE INDEX idx_books_status ON books_v3 (status);
 * CREATE INDEX idx_books_mode ON books_v3 (mode);
 * 
 * -- カードテーブル
 * CREATE TABLE cards_v3 (
 *   id INTEGER PRIMARY KEY AUTOINCREMENT,
 *   uuid TEXT UNIQUE,
 *   book_id INTEGER NOT NULL REFERENCES books_v3(id) ON DELETE CASCADE,
 *   state INTEGER NOT NULL DEFAULT 0,
 *   chunk_start INTEGER NOT NULL,
 *   chunk_end INTEGER NOT NULL,
 *   stability REAL NOT NULL DEFAULT 0,
 *   difficulty REAL NOT NULL DEFAULT 0,
 *   elapsed_days INTEGER NOT NULL DEFAULT 0,
 *   scheduled_days INTEGER NOT NULL DEFAULT 0,
 *   reps INTEGER NOT NULL DEFAULT 0,
 *   lapses INTEGER NOT NULL DEFAULT 0,
 *   due INTEGER NOT NULL,
 *   last_review INTEGER,
 *   created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
 *   updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
 * );
 * CREATE INDEX idx_cards_book_id ON cards_v3 (book_id);
 * CREATE INDEX idx_cards_due ON cards_v3 (due);
 * CREATE INDEX idx_cards_state ON cards_v3 (state);
 * CREATE INDEX idx_cards_book_state_due ON cards_v3 (book_id, state, due);
 * 
 * -- 台帳テーブル
 * CREATE TABLE ledger_v3 (
 *   id INTEGER PRIMARY KEY AUTOINCREMENT,
 *   day_start_timestamp INTEGER NOT NULL UNIQUE,
 *   new_lex INTEGER NOT NULL DEFAULT 0,
 *   review_lex INTEGER NOT NULL DEFAULT 0,
 *   combined_lex INTEGER NOT NULL DEFAULT 0,
 *   new_cards_studied INTEGER NOT NULL DEFAULT 0,
 *   review_cards_studied INTEGER NOT NULL DEFAULT 0,
 *   created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
 *   updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
 * );
 * CREATE INDEX idx_ledger_day_timestamp ON ledger_v3 (day_start_timestamp DESC);
 * 
 * -- 学習ログテーブル
 * CREATE TABLE review_logs_v3 (
 *   id INTEGER PRIMARY KEY AUTOINCREMENT,
 *   card_id INTEGER NOT NULL REFERENCES cards_v3(id) ON DELETE CASCADE,
 *   grade INTEGER NOT NULL,
 *   state_before INTEGER NOT NULL,
 *   state_after INTEGER NOT NULL,
 *   stability_before REAL,
 *   stability_after REAL,
 *   difficulty_before REAL,
 *   difficulty_after REAL,
 *   reviewed_at INTEGER NOT NULL,
 *   created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
 * );
 * CREATE INDEX idx_review_logs_card_id ON review_logs_v3 (card_id);
 * CREATE INDEX idx_review_logs_reviewed_at ON review_logs_v3 (reviewed_at DESC);
 */
