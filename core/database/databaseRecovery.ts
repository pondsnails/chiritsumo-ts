/**
 * Database Recovery Mode - リカバリーフロー
 */
import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import { reportError } from '@core/services/errorReporter';

// FileSystem API の正しいパス
const DOC_DIR = FileSystem.documentDirectory || '';

export enum DatabaseStatus {
  HEALTHY = 'healthy',
  CORRUPTED = 'corrupted',
  MIGRATION_FAILED = 'migration_failed',
  BACKUP_AVAILABLE = 'backup_available',
}

interface DatabaseHealth {
  status: DatabaseStatus;
  error?: Error;
  backupPath?: string;
}

/**
 * データベースの健全性をチェック
 */
export async function checkDatabaseHealth(): Promise<DatabaseHealth> {
  try {
    const db = SQLite.openDatabaseSync('chiritsumo.db');
    
    // 基本的な整合性チェック
    const integrityResult = db.getFirstSync<{ integrity_check: string }>(
      'PRAGMA integrity_check'
    );
    
    if (integrityResult?.integrity_check !== 'ok') {
      return {
        status: DatabaseStatus.CORRUPTED,
        error: new Error('Database integrity check failed'),
      };
    }

    // 必須テーブルの存在確認
    const tables = db.getAllSync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('books', 'cards', 'ledger')"
    );

    if (tables.length < 3) {
      return {
        status: DatabaseStatus.MIGRATION_FAILED,
        error: new Error('Required tables missing'),
      };
    }

    return { status: DatabaseStatus.HEALTHY };
  } catch (error) {
    reportError(error);
    
    // バックアップの有無を確認
    const backupPath = `${DOC_DIR}chiritsumo_backup.db`;
    const backupInfo = await FileSystem.getInfoAsync(backupPath);
    
    if (backupInfo.exists) {
      return {
        status: DatabaseStatus.BACKUP_AVAILABLE,
        error: error instanceof Error ? error : new Error(String(error)),
        backupPath,
      };
    }

    return {
      status: DatabaseStatus.CORRUPTED,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * データベースを自動バックアップから復元
 */
export async function restoreFromBackup(backupPath: string): Promise<void> {
  try {
    const dbPath = `${DOC_DIR}SQLite/chiritsumo.db`;
    
    // 破損したDBを削除
    const dbInfo = await FileSystem.getInfoAsync(dbPath);
    if (dbInfo.exists) {
      await FileSystem.deleteAsync(dbPath);
    }

    // バックアップをコピー
    await FileSystem.copyAsync({
      from: backupPath,
      to: dbPath,
    });

    console.log('[Recovery] Database restored from backup');
  } catch (error) {
    reportError(error);
    throw new Error('Failed to restore from backup');
  }
}

/**
 * データベースを完全リセット（最終手段）
 */
export async function resetDatabase(): Promise<void> {
  try {
    const dbPath = `${DOC_DIR}SQLite/chiritsumo.db`;
    const dbInfo = await FileSystem.getInfoAsync(dbPath);
    
    if (dbInfo.exists) {
      await FileSystem.deleteAsync(dbPath);
      console.log('[Recovery] Database reset completed');
    }
  } catch (error) {
    reportError(error);
    throw new Error('Failed to reset database');
  }
}

/**
 * 定期的な自動バックアップを作成
 */
export async function createAutoBackup(): Promise<void> {
  try {
    const dbPath = `${DOC_DIR}SQLite/chiritsumo.db`;
    const backupPath = `${DOC_DIR}chiritsumo_backup.db`;
    
    const dbInfo = await FileSystem.getInfoAsync(dbPath);
    if (!dbInfo.exists) {
      console.warn('[Backup] Database file not found, skipping backup');
      return;
    }

    await FileSystem.copyAsync({
      from: dbPath,
      to: backupPath,
    });

    console.log('[Backup] Auto backup created successfully');
  } catch (error) {
    reportError(error);
    // バックアップ失敗は致命的ではないため、スローしない
  }
}
