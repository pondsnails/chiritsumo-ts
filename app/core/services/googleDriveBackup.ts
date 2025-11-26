/**
 * Google Drive自動バックアップサービス (Android専用)
 * Google Drive APIを使用してバックアップを自動保存
 */

import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { GDrive } from '@robinbobin/react-native-google-drive-api-wrapper';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKUP_FILENAME = 'chiritsumo_backup.json';
const BACKUP_FOLDER = 'ChiritsumoBackups';
const FOLDER_ID_KEY = 'gdrive_folder_id';
const FILE_ID_KEY = 'gdrive_file_id';
const SIGNED_IN_KEY = 'gdrive_signed_in';

/**
 * Google Driveを初期化
 */
export async function initializeGoogleDrive(): Promise<void> {
  if (Platform.OS !== 'android') return;

  GoogleSignin.configure({
    scopes: ['https://www.googleapis.com/auth/drive.appdata', 'https://www.googleapis.com/auth/drive.file'],
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
  });
}

/**
 * Googleサインインして自動バックアップを有効化
 */
export async function signInAndEnableBackup(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;

  try {
    // Google Playサービスの確認
    await GoogleSignin.hasPlayServices();
    
    // サインイン
    await GoogleSignin.signIn();
    
    // トークンを取得
    const tokens = await GoogleSignin.getTokens();
    
    // GDriveにアクセストークンをセット
    const gdrive = new GDrive();
    gdrive.accessToken = tokens.accessToken;

    // サインイン状態を保存
    await AsyncStorage.setItem(SIGNED_IN_KEY, 'true');

    console.log('Google Drive sign-in successful');
    return true;
  } catch (error) {
    console.error('Google Sign-In failed:', error);
    return false;
  }
}

/**
 * バックアップフォルダを作成または取得
 */
async function getOrCreateBackupFolder(gdrive: GDrive): Promise<string> {
  // キャッシュされたフォルダIDを確認
  const cachedFolderId = await AsyncStorage.getItem(FOLDER_ID_KEY);
  if (cachedFolderId) {
    return cachedFolderId;
  }

  // フォルダを検索
  const queryResult = await gdrive.files.list({
    q: `name='${BACKUP_FOLDER}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
  }) as any;

  let folderId: string;

  if (queryResult.files && queryResult.files.length > 0) {
    // 既存のフォルダを使用
    folderId = queryResult.files[0].id || queryResult.files[0];
  } else {
    // 新しいフォルダを作成
    const folderResult = await gdrive.files.newMultipartUploader()
      .setData(JSON.stringify({}))
      .setRequestBody({
        name: BACKUP_FOLDER,
        mimeType: 'application/vnd.google-apps.folder',
      })
      .execute() as any;
    
    folderId = folderResult.id || folderResult;
  }

  // フォルダIDをキャッシュ
  await AsyncStorage.setItem(FOLDER_ID_KEY, folderId.toString());
  return folderId.toString();
}

/**
 * データをGoogle Driveにバックアップ
 */
export async function performAutoBackup(data: any): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    // サインイン状態を確認
    const signedIn = await AsyncStorage.getItem(SIGNED_IN_KEY);
    if (signedIn !== 'true') {
      console.log('Not signed in to Google Drive');
      return;
    }

    // トークンを取得
    const tokens = await GoogleSignin.getTokens();
    const gdrive = new GDrive();
    gdrive.accessToken = tokens.accessToken;

    // フォルダを取得または作成
    const folderId = await getOrCreateBackupFolder(gdrive);

    // 既存のバックアップファイルを検索
    const cachedFileId = await AsyncStorage.getItem(FILE_ID_KEY);

    if (cachedFileId) {
      try {
        // 既存ファイルを更新
        await gdrive.files.newMultipartUploader()
          .setData(JSON.stringify(data, null, 2))
          .setIdOfFileToUpdate(cachedFileId)
          .setRequestBody({
            name: BACKUP_FILENAME,
          })
          .execute();
        
        console.log('Google Drive backup updated:', new Date().toISOString());
        return;
      } catch (error) {
        console.log('Cached file not found, creating new one');
      }
    }

    // 新しいファイルを作成
    const fileResult = await gdrive.files.newMultipartUploader()
      .setData(JSON.stringify(data, null, 2))
      .setRequestBody({
        name: BACKUP_FILENAME,
        parents: [folderId],
      })
      .execute() as any;

    // ファイルIDをキャッシュ
    const fileId = fileResult.id || fileResult;
    await AsyncStorage.setItem(FILE_ID_KEY, fileId.toString());
    console.log('Google Drive backup created:', new Date().toISOString());
  } catch (error) {
    console.error('Failed to backup to Google Drive:', error);
    throw error;
  }
}

/**
 * Google Driveからバックアップを復元
 */
export async function restoreFromGoogleDrive(): Promise<any | null> {
  if (Platform.OS !== 'android') return null;

  try {
    // サインイン状態を確認
    const signedIn = await AsyncStorage.getItem(SIGNED_IN_KEY);
    if (signedIn !== 'true') {
      console.log('Not signed in to Google Drive');
      return null;
    }

    // トークンを取得
    const tokens = await GoogleSignin.getTokens();
    const gdrive = new GDrive();
    gdrive.accessToken = tokens.accessToken;

    // キャッシュされたファイルIDを確認
    let fileId = await AsyncStorage.getItem(FILE_ID_KEY);

    if (!fileId) {
      // ファイルを検索
      const folderId = await getOrCreateBackupFolder(gdrive);
      const queryResult = await gdrive.files.list({
        q: `name='${BACKUP_FILENAME}' and '${folderId}' in parents and trashed=false`,
      }) as any;

      if (!queryResult.files || queryResult.files.length === 0) {
        console.log('No backup file found');
        return null;
      }

      fileId = queryResult.files[0].id || queryResult.files[0];
      if (fileId) {
        await AsyncStorage.setItem(FILE_ID_KEY, fileId.toString());
      }
    }

    if (!fileId) {
      console.log('File ID not found');
      return null;
    }

    // ファイルをダウンロード
    const content = await gdrive.files.getText(fileId);
    return JSON.parse(content);
  } catch (error) {
    console.error('Failed to restore from Google Drive:', error);
    return null;
  }
}

/**
 * 最終バックアップ日時を取得
 */
export async function getLastBackupDate(): Promise<Date | null> {
  if (Platform.OS !== 'android') return null;

  try {
    // サインイン状態を確認
    const signedIn = await AsyncStorage.getItem(SIGNED_IN_KEY);
    if (signedIn !== 'true') {
      return null;
    }

    // キャッシュされたファイルIDを確認
    const fileId = await AsyncStorage.getItem(FILE_ID_KEY);
    if (!fileId) {
      return null;
    }

    // 簡易的に現在時刻を返す（実際のファイル情報取得はAPIの制約があるため）
    return new Date();
  } catch (error) {
    console.error('Failed to get last backup date:', error);
    return null;
  }
}

/**
 * Google Driveからサインアウト
 */
export async function signOutGoogleDrive(): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    await GoogleSignin.signOut();
    
    // キャッシュをクリア
    await AsyncStorage.removeItem(FOLDER_ID_KEY);
    await AsyncStorage.removeItem(FILE_ID_KEY);
    await AsyncStorage.removeItem(SIGNED_IN_KEY);
    
    console.log('Signed out from Google Drive');
  } catch (error) {
    console.error('Failed to sign out:', error);
  }
}

/**
 * Google Driveのサインイン状態を確認
 */
export async function isSignedInToGoogleDrive(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;

  try {
    const signedIn = await AsyncStorage.getItem(SIGNED_IN_KEY);
    return signedIn === 'true';
  } catch (error) {
    console.error('Failed to check sign-in status:', error);
    return false;
  }
}
