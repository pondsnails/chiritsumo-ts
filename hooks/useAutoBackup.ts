/**
 * 自動バックアップフック
 * アプリ起動時にPro版ユーザーのデータを自動バックアップ
 */

import { useEffect, useState } from 'react';
import { Platform, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSubscriptionStore } from '@/app/core/store/subscriptionStore';
import { performManualBackup } from '@/app/core/services/autoBackupScheduler';

const LAST_BACKUP_KEY = 'last_backup_timestamp';
const BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24時間

export function useAutoBackup() {
  const { isProUser } = useSubscriptionStore();
  const [isBackingUp, setIsBackingUp] = useState(false);

  useEffect(() => {
    if (!isProUser) return;

    const handleAppStateChange = async (nextAppState: string) => {
      // アプリがアクティブになった時だけバックアップ実行
      if (nextAppState === 'active' && !isBackingUp) {
        await performBackupIfNeeded();
      }
    };

    // 初回起動時のバックアップ
    performBackupIfNeeded();

    // アプリ状態監視
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [isProUser]);

  const performBackupIfNeeded = async () => {
    if (isBackingUp) return;

    try {
      // 最終バックアップ時刻を取得
      const lastBackupStr = await AsyncStorage.getItem(LAST_BACKUP_KEY);
      const lastBackup = lastBackupStr ? parseInt(lastBackupStr, 10) : 0;
      const now = Date.now();

      // 24時間以上経過していればバックアップ実行
      if (now - lastBackup >= BACKUP_INTERVAL_MS) {
        setIsBackingUp(true);
        console.log('Starting auto backup...');

        const success = await performManualBackup();

        if (success) {
          await AsyncStorage.setItem(LAST_BACKUP_KEY, now.toString());
          console.log('Auto backup completed successfully');
        } else {
          console.error('Auto backup failed');
        }

        setIsBackingUp(false);
      } else {
        const remainingHours = Math.ceil((BACKUP_INTERVAL_MS - (now - lastBackup)) / (60 * 60 * 1000));
        console.log(`Next backup in ${remainingHours} hours`);
      }
    } catch (error) {
      console.error('Failed to perform auto backup:', error);
      setIsBackingUp(false);
    }
  };
}
