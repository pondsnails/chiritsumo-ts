import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useCardStore } from '@core/store/cardStore';
import { useBookStore } from '@core/store/bookStore';
import { useOnboardingStore } from '@core/store/onboardingStore';
import { checkAndPerformRollover } from '@core/utils/dailyRollover';
import { RolloverNotification } from '@core/components/RolloverNotification';
import { DrizzleLedgerRepository } from '@core/repository/LedgerRepository';

export default function Index() {
  const [showRollover, setShowRollover] = useState(false);
  const [rolloverData, setRolloverData] = useState({ targetLex: 0, newBalance: 0 });
  const router = useRouter();
  const { cards, fetchCards } = useCardStore();
  const { books, fetchBooks } = useBookStore();
  const { hasCompletedOnboarding, isLoading, checkOnboardingStatus } = useOnboardingStore();

  useEffect(() => {
    const initialize = async () => {
      try {
        await checkOnboardingStatus();
      } catch (error) {
        console.error('Failed to initialize:', error);
        // エラーでもオンボーディングへ遷移
        router.replace('/onboarding');
      }
    };
    initialize();
  }, []);

  useEffect(() => {
    if (isLoading) return;
    
    const navigate = async () => {
      try {
        if (hasCompletedOnboarding) {
          // 2回目以降は日次ロールオーバー実行後にquestへ
          await checkRollover();
          router.replace('/(tabs)/quest');
        } else {
          // 初回はオンボーディングへ（ロールオーバーは実行しない）
          router.replace('/onboarding');
        }
      } catch (error) {
        console.error('Navigation failed:', error);
        // フォールバック: エラー時もオンボーディングへ
        router.replace('/onboarding');
      }
    };
    navigate();
  }, [isLoading, hasCompletedOnboarding]);

  const checkRollover = async () => {
    try {
      await Promise.all([fetchCards(), fetchBooks()]);

      const ledgerRepo = new DrizzleLedgerRepository();
      const summaryEntries = await ledgerRepo.findRecent(1);
      const currentBalance = summaryEntries.length > 0 ? summaryEntries[0].balance : 0;

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
