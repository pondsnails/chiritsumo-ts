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
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ShoppingBag, X, TrendingUp, AlertCircle } from 'lucide-react-native';
import { ledgerDB, cardsDB } from '@/app/core/database/db';
import { colors } from '@/app/core/theme/colors';
import { glassEffect } from '@/app/core/theme/glassEffect';
import { useCardStore } from '@/app/core/store/cardStore';
import { useBookStore } from '@/app/core/store/bookStore';
import type { LedgerEntry, Card } from '@/app/core/types';

export default function BankScreen() {
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [todayTarget, setTodayTarget] = useState(0);
  const [todayEarned, setTodayEarned] = useState(0);
  const [showBlackMarket, setShowBlackMarket] = useState(false);
  const [sellableCards, setSellableCards] = useState<Card[]>([]);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  const { cards, fetchCards } = useCardStore();
  const { books } = useBookStore();

  useEffect(() => {
    fetchLedger();
    fetchCards();
  }, []);

  useEffect(() => {
    const sellable = cards.filter(card => card.state !== 0);
    setSellableCards(sellable);
  }, [cards]);

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
    } catch (error) {
      console.error('Failed to fetch ledger:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const solvencyRatio = todayTarget > 0 ? (todayEarned / todayTarget) * 100 : 0;

  const getSellPrice = (card: Card) => {
    const basePrice = 10;
    const stateMultiplier = [0, 1, 1.5, 2, 2.5];
    return Math.floor(basePrice * stateMultiplier[card.state]);
  };

  const handleSellCard = async () => {
    if (!selectedCard) return;

    try {
      const sellPrice = getSellPrice(selectedCard);

      await cardsDB.update(selectedCard.id, {
        state: 0,
        due: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString(),
      });

      await ledgerDB.add({
        date: new Date().toISOString(),
        targetLex: 0,
        earnedLex: sellPrice,
        balance: balance + sellPrice,
      });

      await fetchLedger();
      await fetchCards();
      setSelectedCard(null);
      setShowBlackMarket(false);
    } catch (error) {
      console.error('Failed to sell card:', error);
    }
  };

  const getBookTitle = (bookId: string) => {
    return books.find(b => b.id === bookId)?.title || 'Unknown';
  };

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
                {balance < 0 && (
                  <TouchableOpacity
                    style={styles.blackMarketButton}
                    onPress={() => setShowBlackMarket(true)}
                  >
                    <ShoppingBag color={colors.text} size={16} />
                    <Text style={styles.blackMarketText}>ブラックマーケット</Text>
                  </TouchableOpacity>
                )}
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

        <Modal
          visible={showBlackMarket}
          transparent
          animationType="fade"
          onRequestClose={() => setShowBlackMarket(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[glassEffect.containerLarge, styles.modalContent]}>
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleContainer}>
                  <ShoppingBag color={colors.warning} size={24} />
                  <Text style={styles.modalTitle}>ブラックマーケット</Text>
                </View>
                <TouchableOpacity onPress={() => setShowBlackMarket(false)}>
                  <X color={colors.text} size={24} />
                </TouchableOpacity>
              </View>

              <View style={styles.warningBox}>
                <AlertCircle color={colors.warning} size={16} />
                <Text style={styles.warningText}>
                  カードを売却すると、進捗がリセットされます
                </Text>
              </View>

              {sellableCards.length === 0 ? (
                <View style={styles.emptyMarket}>
                  <Text style={styles.emptyMarketText}>売却可能なカードがありません</Text>
                </View>
              ) : (
                <FlatList
                  data={sellableCards}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[glassEffect.card, styles.marketCard]}
                      onPress={() => setSelectedCard(item)}
                    >
                      <View style={styles.marketCardContent}>
                        <View style={styles.marketCardInfo}>
                          <Text style={styles.marketCardTitle} numberOfLines={1}>
                            {item.front}
                          </Text>
                          <Text style={styles.marketCardBook}>
                            {getBookTitle(item.bookId)}
                          </Text>
                        </View>
                        <View style={styles.marketCardPrice}>
                          <TrendingUp color={colors.success} size={16} />
                          <Text style={styles.marketCardPriceText}>
                            +{getSellPrice(item)} Lex
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  )}
                />
              )}

              {selectedCard && (
                <View style={styles.confirmBox}>
                  <Text style={styles.confirmText}>
                    「{selectedCard.front}」を {getSellPrice(selectedCard)} Lex で売却しますか？
                  </Text>
                  <View style={styles.confirmButtons}>
                    <TouchableOpacity
                      style={[styles.confirmButton, styles.cancelButton]}
                      onPress={() => setSelectedCard(null)}
                    >
                      <Text style={styles.cancelButtonText}>キャンセル</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.confirmButton, styles.sellButton]}
                      onPress={handleSellCard}
                    >
                      <Text style={styles.sellButtonText}>売却</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>
        </Modal>
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
  blackMarketButton: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.warning + '20',
    borderRadius: 20,
    gap: 8,
  },
  blackMarketText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: colors.warning + '20',
    borderRadius: 8,
    marginBottom: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: colors.warning,
  },
  emptyMarket: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyMarketText: {
    fontSize: 14,
    color: colors.textTertiary,
  },
  marketCard: {
    padding: 16,
    marginBottom: 12,
  },
  marketCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  marketCardInfo: {
    flex: 1,
    marginRight: 12,
  },
  marketCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  marketCardBook: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  marketCardPrice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  marketCardPriceText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.success,
  },
  confirmBox: {
    marginTop: 16,
    padding: 16,
    backgroundColor: colors.surface + '40',
    borderRadius: 12,
  },
  confirmText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.surface,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  sellButton: {
    backgroundColor: colors.warning,
  },
  sellButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.background,
  },
});
