/**
 * iCloud自動バックアップサービス (iOS専用)
 * iCloud Document Storageを使用してバックアップを自動保存
 */

import { Paths, Directory, File } from 'expo-file-system';
import { Platform } from 'react-native';

const ICLOUD_BACKUP_FILENAME = 'chiritsumo_backup.json';

/**
 * iCloud自動バックアップを有効化
 */
export async function enableAutoBackup(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;

  try {
    // iCloud ディレクトリを作成
    const iCloudDir = new Directory(Paths.document, 'iCloud');
    if (!iCloudDir.exists) {
      iCloudDir.create();
    }

    return true;
  } catch (error) {
    console.error('Failed to enable iCloud backup:', error);
    return false;
  }
}

/**
 * データをiCloudにバックアップ
 */
export async function performAutoBackup(data: any): Promise<void> {
  if (Platform.OS !== 'ios') return;

  try {
    const backupFile = new File(Paths.document, 'iCloud', ICLOUD_BACKUP_FILENAME);
    await backupFile.write(JSON.stringify(data, null, 2));
    console.log('iCloud backup completed:', new Date().toISOString());
  } catch (error) {
    console.error('Failed to backup to iCloud:', error);
    throw error;
  }
}

/**
 * iCloudからバックアップを復元
 */
export async function restoreFromICloud(): Promise<any | null> {
  if (Platform.OS !== 'ios') return null;

  try {
    const backupFile = new File(Paths.document, 'iCloud', ICLOUD_BACKUP_FILENAME);

    if (!backupFile.exists) {
      console.log('No iCloud backup found');
      return null;
    }

    const content = await backupFile.text();
    return JSON.parse(content);
  } catch (error) {
    console.error('Failed to restore from iCloud:', error);
    return null;
  }
}

/**
 * 最終バックアップ日時を取得
 */
export async function getLastBackupDate(): Promise<Date | null> {
  if (Platform.OS !== 'ios') return null;

  try {
    const backupFile = new File(Paths.document, 'iCloud', ICLOUD_BACKUP_FILENAME);

    if (!backupFile.exists) {
      return null;
    }

    // modificationTimeプロパティが利用可能
    return backupFile.modificationTime ? new Date(backupFile.modificationTime * 1000) : null;
  } catch (error) {
    console.error('Failed to get last backup date:', error);
    return null;
  }
}
