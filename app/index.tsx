import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useCardStore } from '@core/store/cardStore';
import { useBookStore } from '@core/store/bookStore';
import { useOnboardingStore } from '@core/store/onboardingStore';
import { checkAndPerformRollover } from '@core/utils/dailyRollover';
import { RolloverNotification } from '@core/components/RolloverNotification';
import { ledgerDB } from '@core/database/db';

export default function Index() {
  const [showRollover, setShowRollover] = useState(false);
  const [rolloverData, setRolloverData] = useState({ targetLex: 0, newBalance: 0 });
  const router = useRouter();
  const { cards, fetchCards } = useCardStore();
  const { books, fetchBooks } = useBookStore();
  const { hasCompletedOnboarding, isLoading, checkOnboardingStatus } = useOnboardingStore();

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      if (hasCompletedOnboarding) {
        // 2回目以降は直接questへ
        router.replace('/(tabs)/quest');
      } else {
        // 初回はオンボーディングへ
        router.replace('/onboarding');
      }
    }
  }, [isLoading, hasCompletedOnboarding]);

  const initialize = async () => {
    await checkOnboardingStatus();
    await checkRollover();
  };

  const checkRollover = async () => {
    try {
      await Promise.all([fetchCards(), fetchBooks()]);

      const summary = await ledgerDB.getSummary();
      const currentBalance = summary.balance;

      const result = await checkAndPerformRollover(cards, books, currentBalance);

      if (result.performed) {
        setRolloverData({
          targetLex: result.targetLex,
          newBalance: result.newBalance,
        });
        setShowRollover(true);
      }
    } catch (error) {
      console.error('Failed to check rollover:', error);
    }
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#00F260" />

      <RolloverNotification
        visible={showRollover}
        targetLex={rolloverData.targetLex}
        newBalance={rolloverData.newBalance}
        onClose={() => setShowRollover(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
