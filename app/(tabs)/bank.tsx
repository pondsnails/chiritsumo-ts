import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertTriangle, ShoppingBag, Lock } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { ledgerDB } from '@core/database/db';
import { colors } from '@core/theme/colors';
import { glassEffect } from '@core/theme/glassEffect';
import { useBookStore } from '@core/store/bookStore';
import { useSubscriptionStore } from '@core/store/subscriptionStore';
import { checkBankruptcyStatus } from '@core/logic/bankruptcyLogic';
import { BrainAnalyticsDashboard } from '@core/components/BrainAnalyticsDashboard';
import { ShareableStats } from '@core/components/ShareableStats';
import { calculateCurrentStreak } from '@core/utils/streakCalculator';
import i18n from '@core/i18n';
import type { LedgerEntry } from '@core/types';

export default function BankScreen() {
  const router = useRouter();
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [todayTarget, setTodayTarget] = useState(0);
  const [todayEarned, setTodayEarned] = useState(0);
    const [currentStreak, setCurrentStreak] = useState(0);

  const { books } = useBookStore();
  const { isProUser } = useSubscriptionStore();

  useEffect(() => {
    fetchLedger();
  }, []);

  const fetchLedger = async () => {
    try {
      setIsLoading(true);
      const entries = await ledgerDB.getRecent(30);
      setLedger(entries);

      if (entries.length > 0) {
        const today = entries[0];
        setBalance(today.balance);
        setTodayTarget(today.targetLex);
        setTodayEarned(today.earnedLex);
      }

        // ストリーク計算
        const streak = await calculateCurrentStreak();
        setCurrentStreak(streak);
    } catch (error) {
      console.error('Failed to fetch ledger:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const solvencyRatio = todayTarget > 0 ? (todayEarned / todayTarget) * 100 : 0;

  // 破産ステータスチェック
  const bankruptcyStatus = checkBankruptcyStatus(balance, isProUser);

  const getBookTitle = (bookId: string) => {
    return books.find(b => b.id === bookId)?.title || 'Unknown';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const getBankruptcyWarningColor = (level: number) => {
    switch (level) {
      case 3: return colors.error;
      case 2: return colors.warning;
      case 1: return colors.primary;
      default: return colors.textSecondary;
    }
  };

  return (
    <LinearGradient colors={[colors.background, colors.backgroundDark]} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>{i18n.t('bank.title')}</Text>
            <Text style={styles.subtitle}>{i18n.t('bank.subtitle')}</Text>
          </View>

          {isLoading ? (
            <ActivityIndicator color={colors.primary} size="large" />
          ) : (
            <>
              {/* 残高カード */}
              <View style={[glassEffect.containerLarge, styles.balanceCard]}>
                <Text style={styles.balanceLabel}>残高</Text>
                <Text style={[styles.balanceValue, { color: balance >= 0 ? colors.success : colors.error }]}>
                  {balance >= 0 ? '+' : ''}{balance} Lex
                </Text>

                {/* 破産警告（Free版のみ） */}
                {bankruptcyStatus.isInDebt && bankruptcyStatus.warningLevel > 0 && (
                  <View style={[styles.warningBox, { 
                    backgroundColor: getBankruptcyWarningColor(bankruptcyStatus.warningLevel) + '20',
                    borderColor: getBankruptcyWarningColor(bankruptcyStatus.warningLevel),
                  }]}>
                    <AlertTriangle 
                      color={getBankruptcyWarningColor(bankruptcyStatus.warningLevel)} 
                      size={20} 
                    />
                    <View style={styles.warningTextContainer}>
                      <Text style={[styles.warningTitle, { 
                        color: getBankruptcyWarningColor(bankruptcyStatus.warningLevel) 
                      }]}>
                        {bankruptcyStatus.canBankrupt ? '破産状態' : '借金警告'}
                      </Text>
                      <Text style={[styles.warningMessage, { 
                        color: getBankruptcyWarningColor(bankruptcyStatus.warningLevel) 
                      }]}>
                        {bankruptcyStatus.message}
                      </Text>
                      {!isProUser && bankruptcyStatus.warningLevel >= 2 && (
                        <Text style={[styles.warningHint, { 
                          color: getBankruptcyWarningColor(bankruptcyStatus.warningLevel) 
                        }]}>
                          💡 Pro版なら借金上限なし！
                        </Text>
                      )}
                    </View>
                  </View>
                )}
              </View>

              {/* 統計カード */}
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

              {/* シェア機能 */}
              <ShareableStats
                todayLex={todayEarned}
                  currentStreak={currentStreak}
                totalBooks={books.filter(b => b.status === 0).length}
                completionRate={Math.round(solvencyRatio)}
              />

              {/* Pro版専用: 脳内分析ダッシュボード */}
              {isProUser ? (
                <BrainAnalyticsDashboard />
              ) : (
                <TouchableOpacity
                  style={[glassEffect.card, styles.proUpgradeCard]}
                  onPress={() => router.push('/paywall' as any)}
                >
                  <Lock color={colors.primary} size={32} strokeWidth={2} />
                  <View style={styles.proUpgradeContent}>
                    <Text style={styles.proUpgradeTitle}>🧠 脳内分析ダッシュボード</Text>
                    <Text style={styles.proUpgradeDescription}>
                      学習ヒートマップ・忘却曲線・記憶保持率など、あなたの脳を可視化。Pro版で解放！
                    </Text>
                    <Text style={styles.proUpgradePrice}>¥3,600で一生使える</Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* 厳選ルートマップリンク（借金時に表示） */}
              {balance < 0 && (
                <TouchableOpacity
                  style={[glassEffect.card, styles.amazonSearchCard]}
                  onPress={() => router.push('/recommended-routes' as any)}
                >
                  <View style={styles.amazonSearchContent}>
                    <ShoppingBag color={colors.primary} size={24} />
                    <View style={styles.amazonSearchInfo}>
                      <Text style={styles.amazonSearchTitle}>厳選ルートマップ</Text>
                      <Text style={styles.amazonSearchSubtitle}>
                        目標達成への最短ルートを提案
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}

              {/* 履歴 */}
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
    marginBottom: 16,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    width: '100%',
  },
  warningTextContainer: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  warningMessage: {
    fontSize: 14,
    marginBottom: 4,
  },
  warningHint: {
    fontSize: 12,
    fontStyle: 'italic',
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
  amazonSearchCard: {
    padding: 20,
    marginBottom: 24,
  },
  amazonSearchContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  amazonSearchInfo: {
    flex: 1,
  },
  amazonSearchTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  amazonSearchSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
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
  proUpgradeCard: {
    flexDirection: 'row',
    padding: 24,
    marginBottom: 24,
    gap: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary + '40',
  },
  proUpgradeContent: {
    flex: 1,
  },
  proUpgradeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  proUpgradeDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  proUpgradePrice: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '700',
  },
});
