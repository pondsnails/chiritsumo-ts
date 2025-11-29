/**
 * cloudBackupService.ts
 * 
 * iCloud (iOS) / Google Drive App Data (Android) への自動バックアップ統合
 * ユーザー意識不要の裏側同期を実現し、データロスト低評価爆撃を防ぐ
 * 
 * @requirements
 * - iOS: expo-file-system + iCloud Container (Info.plist設定必須)
 * - Android: expo-google-drive (または react-native-google-drive-api-wrapper)
 */

import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { getDrizzleDb } from '../database/drizzleClient';
import { books, cards, ledger, systemSettings, presetBooks } from '../database/schema';

export const CLOUD_BACKUP_ENABLED_KEY = 'cloud_backup_enabled';
export const LAST_CLOUD_BACKUP_AT_KEY = 'last_cloud_backup_at';
export const CLOUD_BACKUP_FILE_NAME = 'chiritsumo_cloud_backup.json';

/**
 * iCloud Container Path (iOS)
 * Info.plistにiCloudコンテナIDを登録する必要あり
 * 例: com.icloud.$(CFBundleIdentifier)
 */
function getICloudDocumentsPath(): string | null {
  if (Platform.OS !== 'ios') return null;
  // expo-file-systemはiCloudコンテナへの直接アクセス未対応
  // ⚠️ 将来的にexpo-document-pickerやカスタムネイティブモジュールでの実装が必要
  // 現時点では documentDirectory + '.icloud' サブディレクトリ使用（簡易版）
  return `${FileSystem.documentDirectory}.icloud/`;
}

/**
 * Google Drive App Data Folder (Android)
 * expo-google-driveやreact-native-google-drive-api-wrapperで実装
 * ⚠️ 現時点ではプレースホルダー（将来実装）
 */
async function uploadToGoogleDrive(fileUri: string): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  // TODO: expo-google-drive統合
  // 1. GoogleSignIn認証
  // 2. Drive API: files.create (appDataFolder)
  // 3. メタデータ保存 (modifiedTime)
  console.warn('[CloudBackup] Google Drive統合は未実装 (TODO)');
  return false;
}

/**
 * クラウドバックアップ有効/無効の確認
 */
export async function isCloudBackupEnabled(): Promise<boolean> {
  try {
    const db = await getDrizzleDb();
    const { eq } = await import('drizzle-orm');
    const result = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, CLOUD_BACKUP_ENABLED_KEY))
      .limit(1);
    return result.length > 0 && result[0].value === 'true';
  } catch {
    return false;
  }
}

/**
 * クラウド自動バックアップの実行
 * - iOS: iCloud Container (簡易版: documentDirectory/.icloud/)
 * - Android: Google Drive App Data (TODO)
 */
export async function performCloudBackup(): Promise<{ success: boolean; error?: string }> {
  try {
    const enabled = await isCloudBackupEnabled();
    if (!enabled) {
      return { success: false, error: 'Cloud backup disabled by user' };
    }

    // データ収集
    const db = await getDrizzleDb();
    const booksData = await db.select().from(books);
    const cardsData = await db.select().from(cards);
    const ledgerData = await db.select().from(ledger);
    const settingsData = await db.select().from(systemSettings);
    const presetLinks = await db.select().from(presetBooks);

    const backupJson = JSON.stringify({
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      books: booksData,
      cards: cardsData,
      ledger: ledgerData,
      systemSettings: settingsData,
      presetBooks: presetLinks,
    });

    if (Platform.OS === 'ios') {
      // iOS: iCloud Container (簡易版)
      const iCloudPath = getICloudDocumentsPath();
      if (!iCloudPath) {
        return { success: false, error: 'iCloud path not available' };
      }

      // ディレクトリ作成
      const dirInfo = await FileSystem.getInfoAsync(iCloudPath);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(iCloudPath, { intermediates: true });
      }

      // バックアップファイル書き込み
      const fileUri = `${iCloudPath}${CLOUD_BACKUP_FILE_NAME}`;
      await FileSystem.writeAsStringAsync(fileUri, backupJson, { encoding: 'utf8' });

      // 最終バックアップ時刻記録
      await db
        .insert(systemSettings)
        .values({
          key: LAST_CLOUD_BACKUP_AT_KEY,
          value: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .onConflictDoUpdate({
          target: systemSettings.key,
          set: { value: new Date().toISOString(), updated_at: new Date().toISOString() },
        })
        .run();

      return { success: true };
    } else if (Platform.OS === 'android') {
      // Android: Google Drive (TODO)
      const tempUri = `${FileSystem.cacheDirectory}${CLOUD_BACKUP_FILE_NAME}`;
      await FileSystem.writeAsStringAsync(tempUri, backupJson, { encoding: 'utf8' });
      const uploaded = await uploadToGoogleDrive(tempUri);

      if (uploaded) {
        await db
          .insert(systemSettings)
          .values({
            key: LAST_CLOUD_BACKUP_AT_KEY,
            value: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .onConflictDoUpdate({
            target: systemSettings.key,
            set: { value: new Date().toISOString(), updated_at: new Date().toISOString() },
          })
          .run();
        return { success: true };
      } else {
        return { success: false, error: 'Google Drive upload not implemented' };
      }
    }

    return { success: false, error: 'Unsupported platform' };
  } catch (e: any) {
    console.error('[CloudBackup] Failed:', e);
    return { success: false, error: e?.message ?? 'Unknown error' };
  }
}

/**
 * クラウドバックアップの有効化/無効化
 */
export async function setCloudBackupEnabled(enabled: boolean): Promise<void> {
  const db = await getDrizzleDb();
  await db
    .insert(systemSettings)
    .values({
      key: CLOUD_BACKUP_ENABLED_KEY,
      value: enabled ? 'true' : 'false',
      updated_at: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: systemSettings.key,
      set: { value: enabled ? 'true' : 'false', updated_at: new Date().toISOString() },
    })
    .run();
}

/**
 * クラウドバックアップからの復元
 * 起動時にDB破損検知した場合に自動実行
 */
export async function restoreFromCloudBackup(): Promise<{ success: boolean; error?: string }> {
  try {
    let fileUri: string | null = null;

    if (Platform.OS === 'ios') {
      const iCloudPath = getICloudDocumentsPath();
      if (!iCloudPath) return { success: false, error: 'iCloud path not available' };
      fileUri = `${iCloudPath}${CLOUD_BACKUP_FILE_NAME}`;

      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        return { success: false, error: 'No cloud backup found' };
      }
    } else if (Platform.OS === 'android') {
      // TODO: Google Driveからダウンロード
      return { success: false, error: 'Google Drive restore not implemented' };
    }

    if (!fileUri) return { success: false, error: 'No backup file' };

    // バックアップファイル読み込み
    const backupContent = await FileSystem.readAsStringAsync(fileUri, { encoding: 'utf8' });
    const backupData = JSON.parse(backupContent);

    // DB復元（replace mode）
    const db = await getDrizzleDb();
    await db.transaction(async (tx) => {
      // 全削除 → 挿入
      await tx.delete(cards);
      await tx.delete(books);
      await tx.delete(ledger);

      if (backupData.books?.length > 0) {
        await tx.insert(books).values(backupData.books);
      }
      if (backupData.cards?.length > 0) {
        await tx.insert(cards).values(backupData.cards);
      }
      if (backupData.ledger?.length > 0) {
        await tx.insert(ledger).values(backupData.ledger);
      }
      if (backupData.presetBooks?.length > 0) {
        await tx.insert(presetBooks).values(backupData.presetBooks);
      }
    });

    return { success: true };
  } catch (e: any) {
    console.error('[CloudBackup] Restore failed:', e);
    return { success: false, error: e?.message ?? 'Unknown error' };
  }
}
