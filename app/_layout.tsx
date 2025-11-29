import { useEffect } from 'react';
import { autoSafBackup } from '@core/services/safBackupService';
import { autoIosBackup } from '@core/services/iosBackupService';
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
          toast.show('自動バックアップ完了', { type: 'success' });
        } else {
          // フォルダ未設定などは静かにスキップ
          console.log('自動バックアップ対象なし (フォルダ未設定または非対応プラットフォーム)');
        }
      } catch (e) {
        toast.show('バックアップ失敗', { type: 'error' });
      }
    })();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
