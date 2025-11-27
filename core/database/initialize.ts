/**
 * Database initialization utility
 * Creates all required tables on first launch
 */
import { getDrizzleDb } from './drizzleClient';

export function initializeDatabase(): void {
  console.log('Initializing database schema...');
  
  // Ensure DB is created and get the underlying SQLite instance
  const db = getDrizzleDb();
  const sqlite = (db as any).session.client;
  
  if (!sqlite) {
    console.error('Failed to get SQLite instance');
    return;
  }
  
  try {
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
    
    console.log('Database schema initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}
