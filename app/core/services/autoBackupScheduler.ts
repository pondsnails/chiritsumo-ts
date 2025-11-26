/**
 * 自動バックアップスケジューラー
 * バックグラウンドタスクで定期的にバックアップを実行
 */

import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { performAutoBackup as performICloudBackup } from './iCloudBackup';
import { booksDB, cardsDB, ledgerDB, inventoryPresetsDB } from '../database/db';

const BACKUP_TASK_NAME = 'auto-backup-task';
const AUTO_BACKUP_ENABLED_KEY = 'auto_backup_enabled';

/**
 * 全データをエクスポート
 */
async function exportAllData() {
  const books = await booksDB.getAll();
  const cards = await cardsDB.getAll();
  const ledger = await ledgerDB.getAll();
  const presets = await inventoryPresetsDB.getAll();

  return {
    version: '7.0.0',
    exportDate: new Date().toISOString(),
    books,
    cards,
    ledger,
    inventoryPresets: presets,
  };
}

// バックグラウンドタスクの定義
TaskManager.defineTask(BACKUP_TASK_NAME, async () => {
  try {
    console.log('Auto backup task started:', new Date().toISOString());
    
    // 自動バックアップが有効か確認
    const isEnabled = await AsyncStorage.getItem(AUTO_BACKUP_ENABLED_KEY);
    if (isEnabled !== 'true') {
      console.log('Auto backup is disabled');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // データをエクスポート
    const data = await exportAllData();

    // プラットフォームに応じてバックアップ
    if (Platform.OS === 'ios') {
      await performICloudBackup(data);
    } else if (Platform.OS === 'android') {
      // Android版は将来的にGoogle Drive APIを使用
      console.log('Google Drive backup not implemented yet');
    }

    console.log('Auto backup completed successfully');
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('Auto backup failed:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * 自動バックアップを有効化（日次）
 */
export async function enableAutoBackup(): Promise<boolean> {
  try {
    // タスクを登録
    await BackgroundFetch.registerTaskAsync(BACKUP_TASK_NAME, {
      minimumInterval: 60 * 60 * 24, // 24時間
      stopOnTerminate: false,
      startOnBoot: true,
    });

    // 設定を保存
    await AsyncStorage.setItem(AUTO_BACKUP_ENABLED_KEY, 'true');
    
    console.log('Auto backup enabled');
    return true;
  } catch (error) {
    console.error('Failed to enable auto backup:', error);
    return false;
  }
}

/**
 * 自動バックアップを無効化
 */
export async function disableAutoBackup(): Promise<boolean> {
  try {
    // タスクを解除
    await BackgroundFetch.unregisterTaskAsync(BACKUP_TASK_NAME);

    // 設定を保存
    await AsyncStorage.setItem(AUTO_BACKUP_ENABLED_KEY, 'false');
    
    console.log('Auto backup disabled');
    return true;
  } catch (error) {
    console.error('Failed to disable auto backup:', error);
    return false;
  }
}

/**
 * 自動バックアップの状態を取得
 */
export async function isAutoBackupEnabled(): Promise<boolean> {
  try {
    const enabled = await AsyncStorage.getItem(AUTO_BACKUP_ENABLED_KEY);
    return enabled === 'true';
  } catch (error) {
    console.error('Failed to get auto backup status:', error);
    return false;
  }
}

/**
 * 手動でバックアップを実行
 */
export async function performManualBackup(): Promise<boolean> {
  try {
    const data = await exportAllData();

    if (Platform.OS === 'ios') {
      await performICloudBackup(data);
    } else if (Platform.OS === 'android') {
      console.log('Google Drive backup not implemented yet');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Manual backup failed:', error);
    return false;
  }
}
