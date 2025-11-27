import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { booksDB, cardsDB, ledgerDB } from '../database/db';

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
export const exportBackup = async (): Promise<void> => {
  try {
    // 全テーブルからデータを取得
    const booksData = await booksDB.getAll();
    const cardsData = await cardsDB.getAll();
    const ledgerData = await ledgerDB.getAll();

    const backup: BackupData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      books: booksData,
      cards: cardsData,
      ledger: ledgerData,
    };

    const jsonString = JSON.stringify(backup, null, 2);
    
    // Webの場合はダウンロード
    if (Platform.OS === 'web') {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chiritsumo_backup_${new Date().getTime()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    // ネイティブの場合はファイルシステムに保存してシェア
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('Sharing is not available on this device');
    }

    const fileUri = `${FileSystem.cacheDirectory}chiritsumo_backup_${new Date().getTime()}.json`;
    // ファイルに書き込み（文字列を直接書き込み）
    await FileSystem.writeAsStringAsync(fileUri, jsonString, { encoding: FileSystem.EncodingType.UTF8 });

    // シェア機能で保存
    await Sharing.shareAsync(fileUri, {
      dialogTitle: 'バックアップを保存',
      mimeType: 'application/json',
    });

    console.log('Backup exported successfully');
  } catch (error) {
    console.error('Failed to export backup:', error);
    throw error;
  }
};

/**
 * JSONファイルを読み込み、データベースを復元
 */
export const importBackup = async (): Promise<void> => {
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
    if (Platform.OS === 'web' && result.assets[0].file) {
      const file = result.assets[0].file as File;
      jsonString = await file.text();
    } else {
      // ネイティブ環境ではURIから読み込み
      const fileUri = result.assets[0].uri;
      jsonString = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.UTF8 });
    }

    const backup: BackupData = JSON.parse(jsonString);

    if (!backup.version || !backup.books || !backup.cards || !backup.ledger) {
      throw new Error('Invalid backup file format');
    }

    // Web専用のIndexedDBマージは廃止（Nativeのみ想定）

    // ネイティブ: データベースにマージ（Upsertロジック）
    const existingBooks = await booksDB.getAll();
    const existingBooksMap = new Map(existingBooks.map(b => [b.id, b]));

    try {
      // 書籍データをマージ（updatedAtで新しい方を優先）
      for (const book of backup.books) {
        const existing = existingBooksMap.get(book.id);
        if (!existing) {
          // 新規書籍は追加
          await booksDB.add(book);
        } else {
          // 既存書籍はタイムスタンプ比較
          const existingTime = new Date(existing.updatedAt || existing.createdAt).getTime();
          const importTime = new Date(book.updatedAt || book.createdAt).getTime();
          if (importTime > existingTime) {
            await booksDB.update(book.id, book);
          }
        }
      }

      // カードはupsert（既にマージ対応）
      for (const card of backup.cards) {
        await cardsDB.upsert(card);
      }

      // 台帳は日付単位でユニーク、既存チェックして追加
      const existingLedger = await ledgerDB.getAll();
      const existingDates = new Set(existingLedger.map(e => e.date));
      for (const entry of backup.ledger) {
        if (!existingDates.has(entry.date)) {
          await ledgerDB.add(entry);
        }
      }

      console.log('Backup merged successfully (Native)');
    } catch (error) {
      console.error('Failed to merge backup:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to import backup:', error);
    throw error;
  }
};

/**
 * Hook形式でエクスポート（Web版ではSQLiteContextは不要）
 */
export const useBackupService = () => {
  return {
    exportBackup,
    importBackup,
  };
};
