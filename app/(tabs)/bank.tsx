import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { localDB } from '@/app/core/database/localStorage';
import { colors } from '@/app/core/theme/colors';
import { glassEffect } from '@/app/core/theme/glassEffect';
import type { LedgerEntry } from '@/app/core/types';

export default function BankScreen() {
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [todayTarget, setTodayTarget] = useState(0);
  const [todayEarned, setTodayEarned] = useState(0);

  useEffect(() => {
    fetchLedger();
  }, []);

  const fetchLedger = async () => {
    try {
      setIsLoading(true);
      const entries = await localDB.ledger.getRecent(30);
      setLedger(entries);

      if (entries.length > 0) {
        const today = entries[0];
        setBalance(today.balance);
        setTodayTarget(today.targetLex);
        setTodayEarned(today.earnedLex);
      }
    } catch (error) {
      console.error('Failed to fetch ledger:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const solvencyRatio = todayTarget > 0 ? (todayEarned / todayTarget) * 100 : 0;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  return (
    <LinearGradient colors={[colors.background, colors.backgroundDark]} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>Bank</Text>
            <Text style={styles.subtitle}>読書銀行</Text>
          </View>

          {isLoading ? (
            <ActivityIndicator color={colors.primary} size="large" />
          ) : (
            <>
              <View style={[glassEffect.containerLarge, styles.balanceCard]}>
                <Text style={styles.balanceLabel}>残高</Text>
                <Text style={[styles.balanceValue, { color: balance >= 0 ? colors.success : colors.error }]}>
                  {balance >= 0 ? '+' : ''}{balance} Lex
                </Text>
              </View>

              <View style={[glassEffect.container, styles.statsCard]}>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>今日の目標</Text>
                  <Text style={styles.statValue}>{todayTarget} Lex</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>今日の獲得</Text>
                  <Text style={styles.statValue}>{todayEarned} Lex</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>達成率</Text>
                  <Text style={[styles.statValue, { color: solvencyRatio >= 100 ? colors.success : colors.warning }]}>
                    {solvencyRatio.toFixed(0)}%
                  </Text>
                </View>
              </View>

              <View style={styles.historyHeader}>
                <Text style={styles.historyTitle}>履歴</Text>
              </View>

              {ledger.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>履歴がありません</Text>
                </View>
              ) : (
                <FlatList
                  data={ledger}
                  scrollEnabled={false}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <View style={[glassEffect.card, styles.ledgerCard]}>
                      <View style={styles.ledgerDate}>
                        <Text style={styles.ledgerDateText}>{formatDate(item.date)}</Text>
                      </View>
                      <View style={styles.ledgerDetails}>
                        <View style={styles.ledgerRow}>
                          <Text style={styles.ledgerLabel}>獲得</Text>
                          <Text style={[styles.ledgerValue, { color: colors.success }]}>
                            +{item.earnedLex}
                          </Text>
                        </View>
                        <View style={styles.ledgerRow}>
                          <Text style={styles.ledgerLabel}>目標</Text>
                          <Text style={[styles.ledgerValue, { color: colors.warning }]}>
                            -{item.targetLex}
                          </Text>
                        </View>
                        <View style={styles.ledgerRow}>
                          <Text style={styles.ledgerLabel}>残高</Text>
                          <Text style={[styles.ledgerValue, { color: item.balance >= 0 ? colors.success : colors.error }]}>
                            {item.balance >= 0 ? '+' : ''}{item.balance}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}
                />
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  balanceCard: {
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  balanceValue: {
    fontSize: 48,
    fontWeight: '700',
  },
  statsCard: {
    padding: 20,
    marginBottom: 24,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  historyHeader: {
    marginBottom: 16,
  },
  historyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textTertiary,
  },
  ledgerCard: {
    flexDirection: 'row',
    padding: 16,
    marginBottom: 12,
  },
  ledgerDate: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  ledgerDateText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  ledgerDetails: {
    flex: 1,
  },
  ledgerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  ledgerLabel: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  ledgerValue: {
    fontSize: 14,
    fontWeight: '600',
  },
});
