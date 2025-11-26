import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
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
      // ネイティブ環境ではURIから読み込み（実装依存）
      // 簡易的にuriをそのまま使う
      throw new Error('Native file import not yet implemented. Please use web version.');
    }

    const backup: BackupData = JSON.parse(jsonString);

    if (!backup.version || !backup.books || !backup.cards || !backup.ledger) {
      throw new Error('Invalid backup file format');
    }

    // LocalStorageの場合は直接上書き
    if (Platform.OS === 'web') {
      localStorage.setItem('chiritsumo_books', JSON.stringify(backup.books));
      localStorage.setItem('chiritsumo_cards', JSON.stringify(backup.cards));
      localStorage.setItem('chiritsumo_ledger', JSON.stringify(backup.ledger));
      console.log('Backup imported successfully');
      return;
    }

    // ネイティブの場合はDrizzle ORMを使用（実装保留）
    throw new Error('Native backup import not yet implemented');
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
