import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { initializeDatabase } from '@/app/core/database/db';
import { performDailyRollover, shouldPerformRollover } from '@/app/core/logic/rolloverLogic';
import { getTodayDateString } from '@/app/core/utils/dateUtils';

export default function RootLayout() {
  useFrameworkReady();

  useEffect(() => {
    const initialize = async () => {
      try {
        await initializeDatabase();

        const lastRolloverDate = await AsyncStorage.getItem('lastRolloverDate');

        if (shouldPerformRollover(lastRolloverDate)) {
          await performDailyRollover();
          await AsyncStorage.setItem('lastRolloverDate', getTodayDateString());
        }
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };

    initialize();
  }, []);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="study" options={{ headerShown: false }} />
        <Stack.Screen name="study-memo" options={{ headerShown: false }} />
        <Stack.Screen name="books/add" options={{ headerShown: false }} />
        <Stack.Screen name="books/edit" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}
