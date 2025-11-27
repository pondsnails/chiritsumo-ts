/**
 * Native Database Implementation (SQLite)
 * Android/iOS用のSQLiteベースのデータベース実装
 */

import * as SQLite from 'expo-sqlite';
import type { Book, Card, LedgerEntry } from '../types';

const db = SQLite.openDatabaseSync('chiritsumo.db');

// テーブル初期化
const initDB = async () => {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'local-user',
      subject_id INTEGER,
      title TEXT NOT NULL,
      isbn TEXT,
      mode INTEGER NOT NULL,
      total_unit INTEGER NOT NULL,
      chunk_size INTEGER,
      completed_unit INTEGER DEFAULT 0,
      status INTEGER NOT NULL,
      previous_book_id TEXT,
      priority INTEGER DEFAULT 0,
      cover_path TEXT,
      target_completion_date TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL,
      unit_index INTEGER NOT NULL,
      state INTEGER NOT NULL,
      stability REAL NOT NULL,
      difficulty REAL NOT NULL,
      due TEXT NOT NULL,
      last_review TEXT,
      reps INTEGER NOT NULL,
      photo_path TEXT,
      FOREIGN KEY (book_id) REFERENCES books(id)
    );

    CREATE TABLE IF NOT EXISTS ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      earned_lex INTEGER NOT NULL,
      target_lex INTEGER NOT NULL,
      balance INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_cards_book_id ON cards(book_id);
    CREATE INDEX IF NOT EXISTS idx_cards_due ON cards(due);
    CREATE INDEX IF NOT EXISTS idx_ledger_date ON ledger(date);

    CREATE TABLE IF NOT EXISTS inventory_presets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL,
      icon_code INTEGER NOT NULL DEFAULT 0,
      book_ids TEXT NOT NULL, -- JSON配列文字列
      is_default INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_inventory_presets_default ON inventory_presets(is_default);
  `);

  // 既存データのuser_idがNULLまたは空の場合にデフォルト値を設定（マイグレーション）
  try {
    db.runSync(`UPDATE books SET user_id = 'local-user' WHERE user_id IS NULL OR user_id = ''`);
  } catch (e) {
    // カラムが存在しない場合や他のエラーは無視（初回起動時など）
  }
};

// Books Repository
export const booksDB = {
  async getAll(): Promise<Book[]> {
    await initDB();
    const result = db.getAllSync<any>('SELECT * FROM books ORDER BY created_at DESC');
    return result.map(row => ({
      id: row.id,
      userId: row.user_id,
      subjectId: row.subject_id,
      title: row.title,
      isbn: row.isbn,
      mode: row.mode,
      totalUnit: row.total_unit,
      chunkSize: row.chunk_size,
      completedUnit: row.completed_unit || 0,
      status: row.status,
      previousBookId: row.previous_book_id,
      priority: row.priority || 0,
      coverPath: row.cover_path,
      targetCompletionDate: row.target_completion_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },

  async getById(id: string): Promise<Book | null> {
    await initDB();
    const result = db.getFirstSync<any>('SELECT * FROM books WHERE id = ?', [id]);
    if (!result) return null;
    
    return {
      id: result.id,
      userId: result.user_id,
      subjectId: result.subject_id,
      title: result.title,
      isbn: result.isbn,
      mode: result.mode,
      totalUnit: result.total_unit,
      chunkSize: result.chunk_size,
      completedUnit: result.completed_unit || 0,
      status: result.status,
      previousBookId: result.previous_book_id,
      priority: result.priority || 0,
      coverPath: result.cover_path,
      targetCompletionDate: result.target_completion_date,
      createdAt: result.created_at,
      updatedAt: result.updated_at,
    };
  },

  async upsert(book: Book): Promise<void> {
    await initDB();
    db.runSync(
      `INSERT OR REPLACE INTO books (
        id, user_id, subject_id, title, isbn, mode, total_unit, chunk_size,
        completed_unit, status, previous_book_id, priority, cover_path,
        target_completion_date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        book.id,
        book.userId || 'local-user', // デフォルト値を設定
        book.subjectId ?? null,
        book.title,
        book.isbn ?? null,
        book.mode,
        book.totalUnit,
        book.chunkSize ?? 1,
        book.completedUnit ?? 0,
        book.status,
        book.previousBookId ?? null,
        book.priority ?? 0,
        book.coverPath ?? null,
        book.targetCompletionDate ?? null,
        book.createdAt,
        book.updatedAt
      ]
    );
  },

  async delete(id: string): Promise<void> {
    await initDB();
    db.runSync('DELETE FROM books WHERE id = ?', [id]);
  },

  // 互換API: 既存コードで利用される add/update を upsert にマッピング
  async add(book: Book): Promise<void> {
    return this.upsert(book);
  },
  async update(id: string, updates: Partial<Book>): Promise<void> {
    // 既存データを取得してマージ（NOT NULL制約を回避）
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Book with id ${id} not found`);
    }
    const merged: Book = {
      ...existing,
      ...updates,
      id, // IDは変更不可
      updatedAt: new Date().toISOString(), // 更新日時を自動更新
    };
    return this.upsert(merged);
  },
};

// Cards Repository
export const cardsDB = {
  async getAll(): Promise<Card[]> {
    await initDB();
    const result = db.getAllSync<any>('SELECT * FROM cards');
    return result.map(row => ({
      id: row.id,
      bookId: row.book_id,
      unitIndex: row.unit_index,
      state: row.state,
      stability: row.stability,
      difficulty: row.difficulty,
      due: new Date(row.due),
      lastReview: row.last_review ? new Date(row.last_review) : null,
      reps: row.reps,
      photoPath: row.photo_path,
    }));
  },

  async getByBookId(bookId: string): Promise<Card[]> {
    await initDB();
    const result = db.getAllSync<any>('SELECT * FROM cards WHERE book_id = ?', [bookId]);
    return result.map(row => ({
      id: row.id,
      bookId: row.book_id,
      unitIndex: row.unit_index,
      state: row.state,
      stability: row.stability,
      difficulty: row.difficulty,
      due: new Date(row.due),
      lastReview: row.last_review ? new Date(row.last_review) : null,
      reps: row.reps,
      photoPath: row.photo_path,
    }));
  },

  async getDueCards(bookIds: string[]): Promise<Card[]> {
    await initDB();
    const now = new Date().toISOString();
    const placeholders = bookIds.map(() => '?').join(',');
    const result = db.getAllSync<any>(
      `SELECT * FROM cards WHERE book_id IN (${placeholders}) AND due <= ? ORDER BY due ASC`,
      [...bookIds, now]
    );
    return result.map(row => ({
      id: row.id,
      bookId: row.book_id,
      unitIndex: row.unit_index,
      state: row.state,
      stability: row.stability,
      difficulty: row.difficulty,
      due: new Date(row.due),
      lastReview: row.last_review ? new Date(row.last_review) : null,
      reps: row.reps,
      photoPath: row.photo_path,
    }));
  },

  async getNewCards(limit: number): Promise<Card[]> {
    await initDB();
    const result = db.getAllSync<any>(
      'SELECT * FROM cards WHERE state = 0 ORDER BY book_id ASC, unit_index ASC LIMIT ?',
      [limit]
    );
    return result.map(row => ({
      id: row.id,
      bookId: row.book_id,
      unitIndex: row.unit_index,
      state: row.state,
      stability: row.stability,
      difficulty: row.difficulty,
      due: new Date(row.due),
      lastReview: row.last_review ? new Date(row.last_review) : null,
      reps: row.reps,
      photoPath: row.photo_path,
    }));
  },

  async upsert(card: Card): Promise<void> {
    await initDB();
    db.runSync(
      `INSERT OR REPLACE INTO cards (
        id, book_id, unit_index, state, stability, difficulty,
        due, last_review, reps, photo_path
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        card.id, card.bookId, card.unitIndex, card.state,
        card.stability, card.difficulty, card.due.toISOString(),
        card.lastReview?.toISOString() || null, card.reps, card.photoPath
      ]
    );
  },

  async bulkUpsert(cards: Card[]): Promise<void> {
    await initDB();
    db.withTransactionSync(() => {
      for (const card of cards) {
        db.runSync(
          `INSERT OR REPLACE INTO cards (
            id, book_id, unit_index, state, stability, difficulty,
            due, last_review, reps, photo_path
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            card.id, card.bookId, card.unitIndex, card.state,
            card.stability, card.difficulty, card.due.toISOString(),
            card.lastReview?.toISOString() || null, card.reps, card.photoPath
          ]
        );
      }
    });
  },

  async deleteByBookId(bookId: string): Promise<void> {
    await initDB();
    db.runSync('DELETE FROM cards WHERE book_id = ?', [bookId]);
  },
};

// Ledger Repository
export const ledgerDB = {
  async getAll(): Promise<LedgerEntry[]> {
    await initDB();
    const result = db.getAllSync<any>('SELECT * FROM ledger ORDER BY date ASC');
    return result.map(row => ({
      id: row.id,
      date: row.date,
      earnedLex: row.earned_lex,
      targetLex: row.target_lex,
      balance: row.balance,
    }));
  },
  async getRecent(limit: number): Promise<LedgerEntry[]> {
    await initDB();
    const result = db.getAllSync<any>(
      'SELECT * FROM ledger ORDER BY date DESC LIMIT ?',
      [limit]
    );
    return result.map(row => ({
      id: row.id,
      date: row.date,
      earnedLex: row.earned_lex,
      targetLex: row.target_lex,
      balance: row.balance,
    }));
  },

  async getSummary(): Promise<{ balance: number; lastRollover: string | null }> {
    await initDB();
    const result = db.getFirstSync<any>(
      'SELECT balance, date FROM ledger ORDER BY date DESC LIMIT 1'
    );
    return {
      balance: result?.balance || 0,
      lastRollover: result?.date || null,
    };
  },

  async upsert(entry: Omit<LedgerEntry, 'id'>): Promise<void> {
    await initDB();
    db.runSync(
      `INSERT OR REPLACE INTO ledger (date, earned_lex, target_lex, balance)
       VALUES (?, ?, ?, ?)`,
      [entry.date, entry.earnedLex, entry.targetLex, entry.balance]
    );
  },
  // 互換API: add (重複日付は無視)
  async add(entry: Omit<LedgerEntry, 'id'>): Promise<void> {
    await initDB();
    db.runSync(
      `INSERT OR IGNORE INTO ledger (date, earned_lex, target_lex, balance)
       VALUES (?, ?, ?, ?)`,
      [entry.date, entry.earnedLex, entry.targetLex, entry.balance]
    );
  },
};

// Inventory Presets Repository
export const inventoryPresetsDB = {
  async getAll(): Promise<import('../types').InventoryPreset[]> {
    await initDB();
    const result = db.getAllSync<any>('SELECT * FROM inventory_presets ORDER BY id ASC');
    return result.map(row => ({
      id: row.id,
      label: row.label,
      iconCode: row.icon_code,
      bookIds: JSON.parse(row.book_ids || '[]'),
      isDefault: !!row.is_default,
    }));
  },

  async add(preset: Omit<import('../types').InventoryPreset, 'id'>): Promise<void> {
    await initDB();
    db.runSync(
      'INSERT INTO inventory_presets (label, icon_code, book_ids, is_default) VALUES (?, ?, ?, ?)',
      [preset.label, preset.iconCode, JSON.stringify(preset.bookIds), preset.isDefault ? 1 : 0]
    );
  },

  async update(id: number, preset: Omit<import('../types').InventoryPreset, 'id'>): Promise<void> {
    await initDB();
    db.runSync(
      'UPDATE inventory_presets SET label = ?, icon_code = ?, book_ids = ?, is_default = ? WHERE id = ?',
      [preset.label, preset.iconCode, JSON.stringify(preset.bookIds), preset.isDefault ? 1 : 0, id]
    );
  },

  async delete(id: number): Promise<void> {
    await initDB();
    db.runSync('DELETE FROM inventory_presets WHERE id = ?', [id]);
  },
};
