/**
 * Drizzle Client Factory (Expo SQLite)
 * Migration Phase: introduces type-safe query builder alongside legacy adapters.
 */
import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';

let _db: ExpoSQLiteDatabase | null = null;

export function getDrizzleDb(): ExpoSQLiteDatabase {
  if (_db) return _db;
  // Reuse same physical database file used by legacy adapter
  const sqlite = SQLite.openDatabaseSync('chiritsumo.db');
  // Initialize local schema and apply lightweight migrations
  try {
    // Run all schema work in an exclusive transaction to avoid locks
    // and ensure other callers wait until init completes.
    (sqlite as any).withExclusiveTransactionSync?.(() => {
      // Enable WAL and foreign keys for better concurrency & integrity
      sqlite.execSync?.('PRAGMA journal_mode = WAL;');
      sqlite.execSync?.('PRAGMA foreign_keys = ON;');

      // Create core tables if not exists
      sqlite.execSync?.(`
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
        balance INTEGER NOT NULL DEFAULT 0
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

      const hasColumn = (table: string, col: string) => {
        try {
          const stmt = (sqlite as any).prepareSync?.(
            `SELECT 1 as ok FROM pragma_table_info(?) WHERE name = ? LIMIT 1`
          );
          const row = (stmt as any)?.getFirstSync?.([table, col]);
          (stmt as any)?.finalizeSync?.();
          return !!row?.ok;
        } catch {
          // Fallback check
          try {
            const stmt2 = (sqlite as any).prepareSync?.(
              `PRAGMA table_info(${table})`
            );
            const rows: any[] = (stmt2 as any)?.getAllSync?.() ?? [];
            (stmt2 as any)?.finalizeSync?.();
            return rows.some((r: any) => r.name === col);
          } catch {
            return false;
          }
        }
      };

      if (!hasColumn('ledger', 'transaction_type')) {
        sqlite.execSync?.(`ALTER TABLE ledger ADD COLUMN transaction_type TEXT DEFAULT 'daily'`);
      }
      if (!hasColumn('ledger', 'note')) {
        sqlite.execSync?.(`ALTER TABLE ledger ADD COLUMN note TEXT`);
      }
      if (!hasColumn('books', 'chunk_size')) {
        sqlite.execSync?.(`ALTER TABLE books ADD COLUMN chunk_size INTEGER NOT NULL DEFAULT 1`);
      }
      if (!hasColumn('books', 'target_completion_date')) {
        sqlite.execSync?.(`ALTER TABLE books ADD COLUMN target_completion_date TEXT`);
      }
    });
  } catch (e) {
    console.warn('SQLite init warning:', e);
  }

  _db = drizzle(sqlite);
  return _db;
}

// Convenience for future injection
export const drizzleDb = getDrizzleDb();
