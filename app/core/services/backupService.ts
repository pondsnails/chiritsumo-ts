import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Paths, File } from 'expo-file-system';
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

    const fileName = `chiritsumo_backup_${new Date().getTime()}.json`;
    const file = new File(Paths.cache, fileName);
    
    // ファイルに書き込み（Blob APIを使用）
    const blob = new Blob([jsonString], { type: 'application/json' });
    const buffer = await blob.arrayBuffer();
    await file.write(new Uint8Array(buffer));
    
    // シェア機能で保存
    await Sharing.shareAsync(file.uri, {
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
      const file = result.assets[0].file;
      jsonString = await file.text();
    } else {
      // ネイティブ環境ではURIから読み込み
      const fileUri = result.assets[0].uri;
      const file = new File(fileUri);
      jsonString = await file.text();
    }

    const backup: BackupData = JSON.parse(jsonString);

    if (!backup.version || !backup.books || !backup.cards || !backup.ledger) {
      throw new Error('Invalid backup file format');
    }

    // Web: IndexedDBに直接上書き
    if (Platform.OS === 'web') {
      // IndexedDBをインポート
      const { indexedBooksDB, indexedCardsDB, indexedLedgerDB } = await import('../database/indexedDB');
      
      // 既存データをクリア（カスケード削除も含む）
      const oldBooks = await indexedBooksDB.getAll();
      for (const book of oldBooks) {
        await indexedBooksDB.delete(book.id);
      }

      // バックアップデータを復元
      for (const book of backup.books) {
        await indexedBooksDB.add(book);
      }

      for (const card of backup.cards) {
        await indexedCardsDB.upsert(card);
      }

      for (const entry of backup.ledger) {
        await indexedLedgerDB.add(entry);
      }

      console.log('Backup imported successfully (Web - IndexedDB)');
      return;
    }

    // ネイティブ: データベースに復元
    // 既存データを取得して保持（ロールバック用）
    const oldBooks = await booksDB.getAll();
    const oldCards = await cardsDB.getAll();
    const oldLedger = await ledgerDB.getAll();

    try {
      // 既存データをクリア
      for (const book of oldBooks) {
        await booksDB.delete(book.id);
      }

      // バックアップデータを復元
      for (const book of backup.books) {
        await booksDB.add(book);
      }

      for (const card of backup.cards) {
        await cardsDB.upsert(card);
      }

      for (const entry of backup.ledger) {
        await ledgerDB.add(entry);
      }

      console.log('Backup imported successfully (Native)');
    } catch (error) {
      // エラー時はロールバック
      console.error('Failed to import backup, rolling back:', error);
      
      // データをクリア
      const currentBooks = await booksDB.getAll();
      for (const book of currentBooks) {
        await booksDB.delete(book.id);
      }

      // 元のデータを復元
      for (const book of oldBooks) {
        await booksDB.add(book);
      }
      for (const card of oldCards) {
        await cardsDB.upsert(card);
      }
      for (const entry of oldLedger) {
        await ledgerDB.add(entry);
      }

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
