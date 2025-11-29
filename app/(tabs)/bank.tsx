import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertTriangle, ShoppingBag, Lock } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useServices } from '@core/di/ServicesProvider';
import { colors } from '@core/theme/colors';
import { glassEffect } from '@core/theme/glassEffect';
import { checkBankruptcyStatus } from '@core/logic/bankruptcyLogic';
import { BrainAnalyticsDashboard } from '@core/components/BrainAnalyticsDashboard';
import { ShareableStats } from '@core/components/ShareableStats';
import { calculateCurrentStreak } from '@core/utils/streakCalculator';
import i18n from '@core/i18n';
import type { LedgerEntry } from '@core/types';

export default function BankScreen() {
  const router = useRouter();
  const { useBookStore, useSubscriptionStore, ledgerRepo } = useServices();
  const { books } = useBookStore();
  const { isProUser } = useSubscriptionStore();
  
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [todayTarget, setTodayTarget] = useState(0);
  const [todayEarned, setTodayEarned] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);

  useEffect(() => {
    fetchLedger();
  }, []);

  const fetchLedger = async () => {
    try {
      setIsLoading(true);
      const entries = await ledgerRepo.findRecent(30);
      setLedger(entries);

      if (entries.length > 0) {
        const today = entries[0];
        setBalance(today.balance);
        setTodayTarget(today.targetLex);
        setTodayEarned(today.earnedLex);
      }

        // ストリーク計算
        const streak = await calculateCurrentStreak(ledgerRepo);
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
                <Text style={[styles.balanceValue, { color: balance >= 0 ? colors.success : colors.primary }]}>
                  {balance >= 0 ? '+' : ''}{balance} XP
                </Text>

                {/* リベンジモード演出（マイナス時） */}
                {bankruptcyStatus.isInDebt && bankruptcyStatus.bonusMultiplier > 1 && (
                  <View style={[styles.revengeBox, { 
                    backgroundColor: colors.warning + '20',
                    borderColor: colors.warning,
                  }]}>
                    <View style={styles.revengeHeader}>
                      <Text style={styles.revengeIcon}>🔥</Text>
                      <Text style={styles.revengeTitle}>REVENGE MODE</Text>
                      <Text style={styles.revengeMultiplier}>{bankruptcyStatus.bonusMultiplier.toFixed(1)}x</Text>
                    </View>
                    <View style={styles.revengeTextContainer}>
                      <Text style={styles.revengeMessage}>
                        今なら獲得XPが{bankruptcyStatus.bonusMultiplier.toFixed(1)}倍！効率よく追い上げましょう
                      </Text>
                      <Text style={styles.revengeHint}>
                        💡 ゾーン発動中！学習を開始してボーナスを獲得
                      </Text>
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

              {/* 積み上げタワー可視化 */}
              {(() => {
                // 過去全ての獲得Lexを合計（累積報酬）
                const totalEarned = ledger.reduce((sum, entry) => sum + entry.earnedLex, 0);
                
                // 100 Lex = 1cm のスケールで物理的な高さに変換
                const heightCm = totalEarned / 100;
                const heightM = heightCm / 100;
                
                // 比喩を選択
                let metaphor = '';
                let icon = '📚';
                if (heightM >= 100) {
                  metaphor = `東京タワー ${(heightM / 333).toFixed(1)}個分`;
                  icon = '🗼';
                } else if (heightM >= 30) {
                  metaphor = `ビル ${Math.floor(heightM / 3)}階相当`;
                  icon = '🏢';
                } else if (heightM >= 1) {
                  metaphor = `人の身長 ${(heightM / 1.7).toFixed(1)}人分`;
                  icon = '🧍';
                } else if (heightCm >= 15) {
                  metaphor = `文庫本 ${Math.floor(heightCm / 1.5)}冊分`;
                  icon = '📚';
                } else if (heightCm >= 0.3) {
                  metaphor = `紙 ${Math.floor(heightCm / 0.01)}枚分`;
                  icon = '📄';
                } else {
                  metaphor = '学習を始めたばかり';
                  icon = '🌱';
                }
                
                return (
                  <View style={[glassEffect.container, styles.towerCard]}>
                    <Text style={styles.towerTitle}>{icon} 積み上げタワー</Text>
                    <Text style={styles.towerSubtitle}>あなたの努力を可視化</Text>
                    
                    <View style={styles.towerStats}>
                      <View style={styles.towerStatItem}>
                        <Text style={styles.towerStatLabel}>累計獲得</Text>
                        <Text style={styles.towerStatValue}>{totalEarned.toLocaleString()} XP</Text>
                      </View>
                      <View style={styles.towerDivider} />
                      <View style={styles.towerStatItem}>
                        <Text style={styles.towerStatLabel}>積み上げ高さ</Text>
                        <Text style={styles.towerStatValue}>
                          {heightM >= 1 ? `${heightM.toFixed(1)} m` : `${heightCm.toFixed(1)} cm`}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.towerMetaphor}>
                      <Text style={styles.towerMetaphorText}>{metaphor}</Text>
                    </View>
                    
                    <Text style={styles.towerHint}>
                      💡 学習を続けるほど、タワーは高く積み上がります
                    </Text>
                  </View>
                );
              })()}

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
                  <View style={styles.proUpsellHeader}>
                    <Lock color={colors.warning} size={40} />
                    <View style={styles.proUpsellBadge}>
                      <Text style={styles.proUpsellBadgeText}>Pro限定</Text>
                    </View>
                  </View>
                  <View style={styles.proUpgradeContent}>
                    <Text style={styles.proUpgradeTitle}>🧠 脳内分析ダッシュボード</Text>
                    <Text style={styles.proUpgradeDescription}>
                      あなたの学習データをAIが分析し、記憶の定着度を可視化します
                    </Text>
                    <View style={styles.proUpsellFeatures}>
                      <View style={styles.proUpsellFeature}>
                        <Text style={styles.proUpsellFeatureIcon}>📊</Text>
                        <Text style={styles.proUpsellFeatureText}>学習ヒートマップ</Text>
                      </View>
                      <View style={styles.proUpsellFeature}>
                        <Text style={styles.proUpsellFeatureIcon}>📉</Text>
                        <Text style={styles.proUpsellFeatureText}>忘却曲線グラフ</Text>
                      </View>
                      <View style={styles.proUpsellFeature}>
                        <Text style={styles.proUpsellFeatureIcon}>💯</Text>
                        <Text style={styles.proUpsellFeatureText}>記憶保持率</Text>
                      </View>
                      <View style={styles.proUpsellFeature}>
                        <Text style={styles.proUpsellFeatureIcon}>⚡</Text>
                        <Text style={styles.proUpsellFeatureText}>学習速度分析</Text>
                      </View>
                    </View>
                    <Text style={styles.proUpgradePrice}>買い切り ¥3,600</Text>
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
                        <Text style={styles.ledgerDateText}>{formatDate(new Date(item.date * 1000).toISOString())}</Text>
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
  revengeBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    width: '100%',
    marginTop: 16,
  },
  revengeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  revengeIcon: {
    fontSize: 24,
  },
  revengeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.warning,
    flex: 1,
  },
  revengeMultiplier: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.warning,
  },
  revengeTextContainer: {
    gap: 8,
  },
  revengeMessage: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
    lineHeight: 20,
  },
  revengeHint: {
    fontSize: 12,
    color: colors.warning,
    fontWeight: '600',
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
  towerCard: {
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: colors.primary + '40',
    backgroundColor: colors.primary + '08',
  },
  towerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  towerSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  towerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  towerStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  towerDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.textTertiary + '40',
  },
  towerStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  towerStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
  towerMetaphor: {
    backgroundColor: colors.primary + '15',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  towerMetaphorText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  towerHint: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  proUpgradeCard: {
    padding: 24,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: colors.warning + '40',
    backgroundColor: colors.warning + '08',
  },
  proUpsellHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  proUpsellBadge: {
    backgroundColor: colors.warning,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  proUpsellBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.background,
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
  proUpsellFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  proUpsellFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '10',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  proUpsellFeatureIcon: {
    fontSize: 16,
  },
  proUpsellFeatureText: {
    fontSize: 12,
    color: colors.text,
  },
  proUpgradePrice: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '700',
  },
});
