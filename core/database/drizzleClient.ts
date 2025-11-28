/**
 * Drizzle Client Factory (Expo SQLite)
 * Lazy initialization with automatic migration and recovery
 */
import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import migrationData from '../../drizzle/migrations';
import { reportError } from '@core/services/errorReporter';
import { checkDatabaseHealth, DatabaseStatus, restoreFromBackup, createAutoBackup } from './databaseRecovery';

let _db: ExpoSQLiteDatabase | null = null;
let _sqlite: SQLite.SQLiteDatabase | null = null;
let _initialized = false;
let _initializationPromise: Promise<ExpoSQLiteDatabase> | null = null;

/**
 * データベース初期化エラー
 * リカバリーモードへの遷移を促すために使用
 */
export class DatabaseInitializationError extends Error {
  constructor(
    message: string,
    public readonly canRecover: boolean = false,
    public readonly backupPath?: string
  ) {
    super(message);
    this.name = 'DatabaseInitializationError';
  }
}

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

    // 🔧 失敗したマイグレーションの一時テーブルをクリーンアップ
    try {
      _sqlite.execSync(`DROP TABLE IF EXISTS __new_books`);
      _sqlite.execSync(`DROP TABLE IF EXISTS __new_cards`);
      _sqlite.execSync(`DROP TABLE IF EXISTS __new_ledger`);
      _sqlite.execSync(`DROP TABLE IF EXISTS __new_velocity_measurements`);
    } catch (cleanupError) {
      console.warn('[Migration] Cleanup warning:', cleanupError);
    }

    // 適用済みマイグレーションを取得
    const appliedMigrations = _sqlite.getAllSync<{ hash: string }>(
      'SELECT hash FROM __drizzle_migrations'
    );
    const appliedHashes = new Set(appliedMigrations.map(m => m.hash));

    // 🔧 新規DBかどうかをチェック（booksテーブルの存在確認）
    const existingTables = _sqlite.getAllSync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='books'"
    );
    const isNewDatabase = existingTables.length === 0;
    
    if (isNewDatabase) {
      console.log('[Migration] 🆕 New database detected, running fresh migrations');
    }

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

      // 🔧 新規DB時はマイグレーション0002をスキップ（既存テーブルからのデータ移行が不要）
      if (isNewDatabase && entry.idx === 2) {
        console.log(`[Migration] ⏭️  Skipping migration ${entry.tag} (new database, no data to migrate)`);
        // 履歴には記録して、次回以降スキップされるようにする
        _sqlite.runSync(
          'INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)',
          [hash, Date.now()]
        );
        continue;
      }

      console.log(`[Migration] 📦 Applying migration ${entry.tag}...`);
      
      // トランザクション内で実行
      _sqlite.execSync('BEGIN TRANSACTION');
      
      try {
        // SQL文を実行(複数文対応)
        const statements = migrationSql
          .split(';')
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 0);

        for (const statement of statements) {
          try {
            _sqlite.execSync(statement);
          } catch (stmtError) {
            console.error(`[Migration] Failed to execute statement:`, statement);
            throw stmtError;
          }
        }

        // マイグレーション履歴に記録
        _sqlite.runSync(
          'INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)',
          [hash, Date.now()]
        );
        
        _sqlite.execSync('COMMIT');
        console.log(`[Migration] ✅ Migration ${entry.tag} applied successfully`);
      } catch (migrationError) {
        console.error(`[Migration] ❌ Migration ${entry.tag} failed:`, migrationError);
        _sqlite.execSync('ROLLBACK');
        throw migrationError;
      }
    }

    _initialized = true;
    console.log('[Migration] Migrations completed successfully');
  } catch (e) {
      reportError(e);
    throw e;
  }
}

export async function getDrizzleDb(): Promise<ExpoSQLiteDatabase> {
  // 既に初期化済みの場合は即座に返す
  if (_db && _initialized) return _db;
  
  // 初期化中の場合は同じPromiseを返す（並行呼び出し対策）
  if (_initializationPromise) return _initializationPromise;
  
  _initializationPromise = (async () => {
    try {
      // SQLiteデータベースを開く（新規の場合は作成される）
      if (!_sqlite) {
        _sqlite = SQLite.openDatabaseSync('chiritsumo.db');
        
        try {
          _sqlite.execSync('PRAGMA journal_mode = WAL;');
          _sqlite.execSync('PRAGMA foreign_keys = ON;');
        } catch (e) {
          console.warn('[DB] PRAGMA setup failed:', e);
        }
      }
      
      // Drizzle ORMのインスタンスを作成
      if (!_db) {
        _db = drizzle(_sqlite);
      }
      
      // マイグレーションを実行
      await runMigrations(_db);
      
      // 初期化成功後に自動バックアップを作成
      await createAutoBackup();
      
      return _db;
    } catch (error) {
      _initializationPromise = null; // エラー時はPromiseをリセット
      
      if (error instanceof DatabaseInitializationError) {
        throw error;
      }
      
      reportError(error);
      throw new DatabaseInitializationError(
        'Failed to initialize database',
        false
      );
    }
  })();
  
  return _initializationPromise;
}

// Convenience for future injection
export function setDrizzleDb(db: ExpoSQLiteDatabase) {
  _db = db;
  _initialized = true;
}
