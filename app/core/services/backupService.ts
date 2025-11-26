import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { useSQLiteContext } from 'expo-sqlite';
import { books, cards, ledger } from '../database/schema';

export interface BackupData {
  version: string;
  exportedAt: string;
  books: any[];
  cards: any[];
  ledger: any[];
}

/**
 * 全データをJSONとしてエクスポートし、シェア機能で保存
 */
export const exportBackup = async (db: any): Promise<void> => {
  try {
    const drizzleDb = drizzle(db);

    // 全テーブルからデータを取得
    const booksData = await drizzleDb.select().from(books);
    const cardsData = await drizzleDb.select().from(cards);
    const ledgerData = await drizzleDb.select().from(ledger);

    const backup: BackupData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      books: booksData,
      cards: cardsData,
      ledger: ledgerData,
    };

    const jsonString = JSON.stringify(backup, null, 2);
    
    // Webの場合はダウンロード
    if (typeof window !== 'undefined') {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chiritsumo_backup_${new Date().getTime()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    // ネイティブの場合はシェア機能を使用
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      // ネイティブでのシェアは文字列データとして
      const fileName = `chiritsumo_backup_${new Date().getTime()}.json`;
      // @ts-ignore - Sharing accepts string data on some platforms
      await Sharing.shareAsync(jsonString, {
        dialogTitle: 'バックアップを保存',
        mimeType: 'application/json',
      });
    } else {
      throw new Error('Sharing is not available on this device');
    }

    console.log('Backup exported successfully');
  } catch (error) {
    console.error('Failed to export backup:', error);
    throw error;
  }
};

/**
 * JSONファイルを読み込み、データベースを復元
 */
export const importBackup = async (db: any): Promise<void> => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      return;
    }

    let jsonString: string;
    
    // Web環境の場合
    if (typeof window !== 'undefined' && result.assets[0].file) {
      const file = result.assets[0].file;
      jsonString = await file.text();
    } else {
      // ネイティブ環境ではURIから読み込み（実装依存）
      // 簡易的にuriをそのまま使う
      throw new Error('Native file import not yet implemented. Please use web version.');
    }

    const backup: BackupData = JSON.parse(jsonString);

    if (!backup.version || !backup.books || !backup.cards || !backup.ledger) {
      throw new Error('Invalid backup file format');
    }

    const drizzleDb = drizzle(db);

    await db.execAsync('BEGIN TRANSACTION;');

    try {
      // 既存データを削除
      await drizzleDb.delete(cards);
      await drizzleDb.delete(books);
      await drizzleDb.delete(ledger);

      // バックアップデータを挿入
      if (backup.books.length > 0) {
        await drizzleDb.insert(books).values(backup.books);
      }
      if (backup.cards.length > 0) {
        await drizzleDb.insert(cards).values(backup.cards);
      }
      if (backup.ledger.length > 0) {
        await drizzleDb.insert(ledger).values(backup.ledger);
      }

      await db.execAsync('COMMIT;');
      console.log('Backup imported successfully');
    } catch (error) {
      await db.execAsync('ROLLBACK;');
      throw error;
    }
  } catch (error) {
    console.error('Failed to import backup:', error);
    throw error;
  }
};

/**
 * Hook形式でエクスポート
 */
export const useBackupService = () => {
  const db = useSQLiteContext();

  return {
    exportBackup: () => exportBackup(db),
    importBackup: () => importBackup(db),
  };
};
