/**
 * Drizzle Client Factory (Expo SQLite)
 * Lazy initialization with automatic migration
 */
import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import migrationData from '../../drizzle/migrations';

let _db: ExpoSQLiteDatabase | null = null;
let _sqlite: SQLite.SQLiteDatabase | null = null;
let _initialized = false;

async function runMigrations(db: ExpoSQLiteDatabase): Promise<void> {
  if (_initialized) return;
  
  try {
    console.log('[Migration] Running database migrations...');
    
    if (!_sqlite) throw new Error('SQLite not initialized');

    // マイグレーション履歴テーブルの作成
    _sqlite.execSync(`
      CREATE TABLE IF NOT EXISTS __drizzle_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hash TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
    `);

    // 適用済みマイグレーションを取得
    const appliedMigrations = _sqlite.getAllSync<{ hash: string }>(
      'SELECT hash FROM __drizzle_migrations'
    );
    const appliedHashes = new Set(appliedMigrations.map(m => m.hash));

    // 未適用のマイグレーションを実行
    for (const entry of migrationData.journal.entries) {
      const migrationKey = `m${String(entry.idx).padStart(4, '0')}`;
      const migrationSql = (migrationData.migrations as any)[migrationKey];
      
      if (!migrationSql) {
        console.warn(`[Migration] ⚠️  Migration ${migrationKey} not found`);
        continue;
      }

      const hash = `${entry.tag}_${entry.idx}`;
      
      if (appliedHashes.has(hash)) {
        console.log(`[Migration] ✓ Migration ${entry.tag} already applied`);
        continue;
      }

      console.log(`[Migration] 📦 Applying migration ${entry.tag}...`);
      
      // SQL文を実行（複数文対応）
      const statements = migrationSql
        .split(';')
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0);

      for (const statement of statements) {
        _sqlite.execSync(statement);
      }

      // マイグレーション履歴に記録
      _sqlite.runSync(
        'INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)',
        [hash, Date.now()]
      );
      
      console.log(`[Migration] ✅ Migration ${entry.tag} applied successfully`);
    }

    _initialized = true;
    console.log('[Migration] Migrations completed successfully');
  } catch (e) {
      reportError(e);
    throw e;
  }
}

export async function getDrizzleDb(): Promise<ExpoSQLiteDatabase> {
  if (_db && _initialized) return _db;
  
  if (!_sqlite) {
    _sqlite = SQLite.openDatabaseSync('chiritsumo.db');
    
    try {
      _sqlite.execSync('PRAGMA journal_mode = WAL;');
      _sqlite.execSync('PRAGMA foreign_keys = ON;');
    } catch (e) {
      console.warn('PRAGMA setup failed:', e);
    }
  }
  
  if (!_db) {
    _db = drizzle(_sqlite);
  }
  
  // Run migrations on first initialization
  if (!_initialized) {
    await runMigrations(_db);
  }
  
  return _db;
}

// Convenience for future injection
export function setDrizzleDb(db: ExpoSQLiteDatabase) {
  _db = db;
  _initialized = true;
}
