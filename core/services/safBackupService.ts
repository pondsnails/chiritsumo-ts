// safBackupService.ts
// Android Storage Access Framework (SAF) を使った自動バックアップ機能
// Google Console不要・コードベース完結

import * as FileSystem from 'expo-file-system';
const StorageAccessFramework = require('expo-file-system/StorageAccessFramework') as any; // 型未提供のため
import { Platform } from 'react-native';
import { getDrizzleDb } from '../database/drizzleClient';
import { books, cards, ledger, systemSettings, presetBooks } from '../database/schema';

/** SAFバックアップ先URIをSystemSettingsに保存するキー */
export const SAF_BACKUP_URI_KEY = 'saf_backup_folder_uri';
export const LAST_BACKUP_AT_KEY = 'last_auto_backup_at';

/** SAFバックアップ先フォルダの選択（初回のみ） */
export async function requestSafBackupFolder(): Promise<string | null> {
  if (Platform.OS !== 'android') return null;
  try {
    const uri = await StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (uri && uri.granted && uri.directoryUri) {
      // SystemSettingsに保存（アプリ内DB）
      const db = await getDrizzleDb();
      await db.insert(systemSettings).values({ key: SAF_BACKUP_URI_KEY, value: uri.directoryUri, updated_at: new Date().toISOString() }).onConflictDoUpdate({ target: systemSettings.key, set: { value: uri.directoryUri, updated_at: new Date().toISOString() } }).run();
      return uri.directoryUri;
    }
    return null;
  } catch (e) {
    console.warn('SAFフォルダ選択失敗', e);
    return null;
  }
}

/** SAFバックアップJSONをフォルダに自動保存 */
export async function autoSafBackup(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    const db = await getDrizzleDb();
    const { eq } = await import('drizzle-orm');
    const folderSetting = await db.select().from(systemSettings).where(eq(systemSettings.key, SAF_BACKUP_URI_KEY)).limit(1);
    const folderUri = folderSetting.length > 0 ? folderSetting[0].value : null;
    if (!folderUri) return false;

    // データ収集
    const booksData = await db.select().from(books);
    const cardsData = await db.select().from(cards);
    const ledgerData = await db.select().from(ledger);
    const settingsData = await db.select().from(systemSettings);
    const presetLinks = await db.select().from(presetBooks);

    const backupJson = JSON.stringify({
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      books: booksData,
      cards: cardsData,
      ledger: ledgerData,
      systemSettings: settingsData,
      presetBooks: presetLinks,
    });

    const fileName = `chiritsumo_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    await StorageAccessFramework.createFileAsync(folderUri, fileName, 'application/json');
    const files = await StorageAccessFramework.readDirectoryAsync(folderUri);
    const fileUri = files.find((f: string) => f.endsWith(fileName));
    if (!fileUri) return false;
    await FileSystem.writeAsStringAsync(fileUri, backupJson, { encoding: 'utf8' });

    // 最終バックアップ時刻を記録
    await db.insert(systemSettings)
      .values({ key: LAST_BACKUP_AT_KEY, value: new Date().toISOString(), updated_at: new Date().toISOString() })
      .onConflictDoUpdate({ target: systemSettings.key, set: { value: new Date().toISOString(), updated_at: new Date().toISOString() } })
      .run();

    return true;
  } catch (e) {
    console.warn('SAFバックアップ失敗', e);
    return false;
  }
}
