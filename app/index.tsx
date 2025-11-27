import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import { useCardStore } from '@/app/core/store/cardStore';
import { useBookStore } from '@/app/core/store/bookStore';
import { checkAndPerformRollover } from '@/app/core/utils/dailyRollover';
import { RolloverNotification } from '@/app/core/components/RolloverNotification';
import { ledgerDB } from '@/app/core/database/db';

export default function Index() {
  const [showRollover, setShowRollover] = useState(false);
  const [rolloverData, setRolloverData] = useState({ targetLex: 0, newBalance: 0 });
  const { cards, fetchCards } = useCardStore();
  const { books, fetchBooks } = useBookStore();

  useEffect(() => {
    checkRollover();
  }, []);

  const checkRollover = async () => {
    try {
      await Promise.all([fetchCards(), fetchBooks()]);

      // Get recent ledger entries to find the current balance
      const recentEntries = await ledgerDB.getRecent(1);
      const currentBalance = recentEntries.length > 0 ? recentEntries[0].balance : 0;

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
    <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>ChiriTsumo</Text>
        <Text style={styles.subtitle}>間隔反復学習アプリ</Text>
        <Link href="/(tabs)/quest" style={styles.link}>
          <Text style={styles.linkText}>開始</Text>
        </Link>
      </View>

      <RolloverNotification
        visible={showRollover}
        targetLex={rolloverData.targetLex}
        newBalance={rolloverData.newBalance}
        onClose={() => setShowRollover(false)}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  title: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 18,
    color: '#94A3B8',
  },
  link: {
    marginTop: 32,
    paddingHorizontal: 32,
    paddingVertical: 16,
    backgroundColor: '#00F260',
    borderRadius: 12,
  },
  linkText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
});
