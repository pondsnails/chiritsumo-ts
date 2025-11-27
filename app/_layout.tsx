import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ServicesProvider } from '@core/di/ServicesProvider';
import { ToastProvider } from '@core/ui/ToastProvider';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useAppStateRollover } from '@/hooks/useAppStateRollover';

function AppContent() {
  // バックグラウンド復帰時の日付変更を監視
  // ⚠️ ServicesProvider内で呼び出す必要がある
  useAppStateRollover();

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
