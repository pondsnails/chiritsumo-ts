/**
 * Drizzle Client Factory (Expo SQLite)
 * Lazy initialization with auto-schema creation
 */
import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';

let _db: ExpoSQLiteDatabase | null = null;
let _sqlite: SQLite.SQLiteDatabase | null = null;
let _initialized = false;

function ensureSchema(sqlite: SQLite.SQLiteDatabase): void {
  if (_initialized) return;
  
  try {
    // まず既存のテーブル構造を確認して、不足しているカラムを追加
    const columnsToAdd = [
      'elapsed_days INTEGER NOT NULL DEFAULT 0',
      'scheduled_days INTEGER NOT NULL DEFAULT 0',
      'reps INTEGER NOT NULL DEFAULT 0',
      'lapses INTEGER NOT NULL DEFAULT 0',
      'last_review TEXT',
      'photo_path TEXT'
    ];
    
    for (const column of columnsToAdd) {
      try {
        sqlite.execSync(`ALTER TABLE cards ADD COLUMN ${column};`);
        console.log(`[Migration] Added ${column.split(' ')[0]} column`);
      } catch (e) {
        // カラムが既に存在する場合はエラーになるが無視
      }
    }
    
    sqlite.execSync(`
      CREATE TABLE IF NOT EXISTS books (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL DEFAULT 'local-user',
        subject_id INTEGER,
        title TEXT NOT NULL,
        isbn TEXT,
        mode INTEGER NOT NULL DEFAULT 1,
        total_unit INTEGER NOT NULL,
        chunk_size INTEGER NOT NULL DEFAULT 1,
        completed_unit INTEGER NOT NULL DEFAULT 0,
        status INTEGER NOT NULL DEFAULT 0,
        previous_book_id TEXT,
        priority INTEGER NOT NULL DEFAULT 1,
        cover_path TEXT,
        target_completion_date TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS cards (
        id TEXT PRIMARY KEY,
        book_id TEXT NOT NULL,
        unit_index INTEGER NOT NULL,
        state INTEGER NOT NULL DEFAULT 0,
        stability REAL NOT NULL DEFAULT 0,
        difficulty REAL NOT NULL DEFAULT 0,
        elapsed_days INTEGER NOT NULL DEFAULT 0,
        scheduled_days INTEGER NOT NULL DEFAULT 0,
        reps INTEGER NOT NULL DEFAULT 0,
        lapses INTEGER NOT NULL DEFAULT 0,
        due TEXT NOT NULL DEFAULT (datetime('now')),
        last_review TEXT,
        photo_path TEXT,
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS ledger (
        id INTEGER PRIMARY KEY,
        date TEXT NOT NULL,
        earned_lex INTEGER NOT NULL DEFAULT 0,
        target_lex INTEGER NOT NULL DEFAULT 0,
        balance INTEGER NOT NULL DEFAULT 0,
        transaction_type TEXT DEFAULT 'daily',
        note TEXT
      );
      CREATE UNIQUE INDEX IF NOT EXISTS ledger_date_unique ON ledger(date);

      CREATE TABLE IF NOT EXISTS inventory_presets (
        id INTEGER PRIMARY KEY,
        label TEXT NOT NULL,
        icon_code INTEGER NOT NULL DEFAULT 0,
        is_default INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS preset_books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        preset_id INTEGER NOT NULL,
        book_id TEXT NOT NULL,
        FOREIGN KEY (preset_id) REFERENCES inventory_presets(id) ON DELETE CASCADE,
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    _initialized = true;
  } catch (e) {
    console.warn('Schema creation warning:', e);
  }
}

export function getDrizzleDb(): ExpoSQLiteDatabase {
  if (_db) return _db;
  
  if (!_sqlite) {
    _sqlite = SQLite.openDatabaseSync('chiritsumo.db');
    
    try {
      _sqlite.execSync('PRAGMA journal_mode = WAL;');
      _sqlite.execSync('PRAGMA foreign_keys = ON;');
    } catch (e) {
      console.warn('PRAGMA setup failed:', e);
    }
    
    // Create tables if needed
    ensureSchema(_sqlite);
  }
  
  _db = drizzle(_sqlite);
  return _db;
}

// Convenience for future injection
export function setDrizzleDb(db: ExpoSQLiteDatabase) {
  _db = db;
}
