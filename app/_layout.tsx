import { useEffect } from 'react';
import { autoSafBackup } from '@core/services/safBackupService';
import { autoIosBackup } from '@core/services/iosBackupService';
import { performCloudBackup } from '@core/services/cloudBackupService';
import { useToast } from '@core/ui/ToastProvider';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ServicesProvider } from '@core/di/ServicesProvider';
import { ToastProvider } from '@core/ui/ToastProvider';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useAppStateRollover } from '@/hooks/useAppStateRollover';

function AppContent() {
  const toast = useToast();
  // バックグラウンド復帰時の日付変更を監視
  // ⚠️ ServicesProvider内で呼び出す必要がある
  useAppStateRollover();

  // アプリ起動時に自動バックアップ
  useEffect(() => {
    (async () => {
      try {
        const androidOk = await autoSafBackup();
        const iosOk = await autoIosBackup();
        if (androidOk || iosOk) {
          toast.show('自動バックアップ完了');
        } else {
          // フォルダ未設定などは静かにスキップ
          console.log('自動バックアップ対象なし (フォルダ未設定または非対応プラットフォーム)');
        }

        // クラウド自動バックアップ（裏側で実行、エラーでも続行）
        const cloudResult = await performCloudBackup();
        if (cloudResult.success) {
          console.log('[CloudBackup] 自動バックアップ成功');
        } else if (cloudResult.error !== 'Cloud backup disabled by user') {
          console.warn('[CloudBackup] 自動バックアップ失敗:', cloudResult.error);
        }
      } catch (e) {
        toast.show('バックアップ失敗');
      }
    })();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="backup-setup" options={{ headerShown: false }} />
      <Stack.Screen name="recovery" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  useFrameworkReady();

  return (
    <SafeAreaProvider>
      <ServicesProvider>
        <ToastProvider>
          <AppContent />
          <StatusBar style="light" />
        </ToastProvider>
      </ServicesProvider>
    </SafeAreaProvider>
  );
}
