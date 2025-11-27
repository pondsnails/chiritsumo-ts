import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ServicesProvider } from '@core/di/ServicesProvider';
import { ToastProvider } from '@core/ui/ToastProvider';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useAppStateRollover } from '@/hooks/useAppStateRollover';

export default function RootLayout() {
  useFrameworkReady();
  
  // バックグラウンド復帰時の日付変更を監視
  useAppStateRollover();

  return (
    <SafeAreaProvider>
      <ServicesProvider>
        <ToastProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="light" />
        </ToastProvider>
      </ServicesProvider>
    </SafeAreaProvider>
  );
}
