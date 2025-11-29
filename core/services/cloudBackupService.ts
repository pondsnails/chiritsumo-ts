/**
 * cloudBackupService.ts
 * 
 * iCloud (iOS) / Google Drive App Data (Android) への自動バックアップ統合
 * ユーザー意識不要の裏側同期を実現し、データロスト低評価爆撃を防ぐ
 * 
 * @requirements
 * - iOS: expo-file-system + iCloud Container (Info.plist設定必須)
 * - Android: Storage Access Framework (SAF) でGoogle Driveフォルダ選択
 *   → ユーザーが一度選択すれば以降は自動バックアップ（API認証不要）
 */

// Use legacy typings for documentDirectory/cacheDirectory
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { getDrizzleDb } from '../database/drizzleClient';
import { books, cards, ledger, systemSettings, presetBooks } from '../database/schema';

export const CLOUD_BACKUP_ENABLED_KEY = 'cloud_backup_enabled';
export const LAST_CLOUD_BACKUP_AT_KEY = 'last_cloud_backup_at';
export const CLOUD_BACKUP_FILE_NAME = 'chiritsumo_cloud_backup.json';
export const ANDROID_CLOUD_FOLDER_URI_KEY = 'android_cloud_folder_uri'; // SAF永続URI保存用

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
 * Google Drive フォルダ選択（Android）
 * SAFでユーザーにGoogle Driveフォルダを選択してもらい、URIを永続保存
 * 以降は自動バックアップが可能になる
 */
export async function requestAndroidCloudFolder(): Promise<{ success: boolean; error?: string }> {
  if (Platform.OS !== 'android') {
    return { success: false, error: 'Android only' };
  }

  try {
    // StorageAccessFrameworkの取得
    const StorageAccessFramework = (FileSystem as any).StorageAccessFramework;
    if (!StorageAccessFramework) {
      return { success: false, error: 'SAF not available (Expo Go does not support SAF)' };
    }

    // ユーザーにフォルダ選択を促す
    const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (!permissions.granted) {
      return { success: false, error: 'Folder selection cancelled by user' };
    }

    // 取得したURI（永続化可能）を保存
    const folderUri = permissions.directoryUri;
    const db = await getDrizzleDb();
    await db
      .insert(systemSettings)
      .values({
        key: ANDROID_CLOUD_FOLDER_URI_KEY,
        value: folderUri,
        updated_at: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { value: folderUri, updated_at: new Date().toISOString() },
      })
      .run();

    return { success: true };
  } catch (e: any) {
    console.error('[CloudBackup] Android folder selection failed:', e);
    return { success: false, error: e?.message ?? 'Unknown error' };
  }
}

/**
 * Android SAF経由でGoogle Driveにバックアップ
 * ユーザーが事前にフォルダを選択していれば自動バックアップ可能
 */
async function uploadToAndroidCloud(backupJson: string): Promise<boolean> {
  if (Platform.OS !== 'android') return false;

  try {
    const StorageAccessFramework = (FileSystem as any).StorageAccessFramework;
    if (!StorageAccessFramework) {
      console.warn('[CloudBackup] SAF not available');
      return false;
    }

    // 保存済みフォルダURIを取得
    const db = await getDrizzleDb();
    const { eq } = await import('drizzle-orm');
    const result = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, ANDROID_CLOUD_FOLDER_URI_KEY))
      .limit(1);

    if (result.length === 0) {
      console.warn('[CloudBackup] No folder URI saved. User needs to select folder first.');
      return false;
    }

    const folderUri = result[0].value;

    // 既存ファイルを削除（上書き処理）
    try {
      const existingFiles = await StorageAccessFramework.readDirectoryAsync(folderUri);
      const existingBackup = existingFiles.find((f: string) =>
        f.endsWith(CLOUD_BACKUP_FILE_NAME)
      );
      if (existingBackup) {
        await StorageAccessFramework.deleteAsync(existingBackup, { idempotent: true });
      }
    } catch (e) {
      // ファイルが存在しない場合はエラーになるが無視
      console.log('[CloudBackup] No existing backup file to delete');
    }

    // 新規ファイル作成
    const fileUri = await StorageAccessFramework.createFileAsync(
      folderUri,
      CLOUD_BACKUP_FILE_NAME,
      'application/json'
    );

    await FileSystem.writeAsStringAsync(fileUri, backupJson, { encoding: 'utf8' });

    console.log('[CloudBackup] Android backup successful:', fileUri);
    return true;
  } catch (e: any) {
    console.error('[CloudBackup] Android upload failed:', e);
    return false;
  }
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
      // Android: SAF経由でGoogle Driveフォルダに自動保存
      const uploaded = await uploadToAndroidCloud(backupJson);

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
        return { success: false, error: 'Android cloud folder not configured. User needs to select Google Drive folder in backup settings.' };
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
    let backupContent: string | null = null;

    if (Platform.OS === 'ios') {
      const iCloudPath = getICloudDocumentsPath();
      if (!iCloudPath) return { success: false, error: 'iCloud path not available' };
      fileUri = `${iCloudPath}${CLOUD_BACKUP_FILE_NAME}`;

      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        return { success: false, error: 'No cloud backup found' };
      }

      backupContent = await FileSystem.readAsStringAsync(fileUri, { encoding: 'utf8' });
    } else if (Platform.OS === 'android') {
      // Android: SAF経由でバックアップファイル読み込み
      const StorageAccessFramework = (FileSystem as any).StorageAccessFramework;
      if (!StorageAccessFramework) {
        return { success: false, error: 'SAF not available' };
      }

      // 保存済みフォルダURIを取得
      const db = await getDrizzleDb();
      const { eq } = await import('drizzle-orm');
      const result = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.key, ANDROID_CLOUD_FOLDER_URI_KEY))
        .limit(1);

      if (result.length === 0) {
        return { success: false, error: 'No cloud folder configured' };
      }

      const folderUri = result[0].value;

      // フォルダ内のバックアップファイルを探す
      const files = await StorageAccessFramework.readDirectoryAsync(folderUri);
      const backupFile = files.find((f: string) => f.endsWith(CLOUD_BACKUP_FILE_NAME));

      if (!backupFile) {
        return { success: false, error: 'No backup file found in cloud folder' };
      }

      backupContent = await FileSystem.readAsStringAsync(backupFile, { encoding: 'utf8' });
    }

    if (!backupContent) return { success: false, error: 'No backup content' };

    // バックアップデータ復元
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
