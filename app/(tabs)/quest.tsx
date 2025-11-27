import React, { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Play, Settings } from 'lucide-react-native';
import { colors } from '@core/theme/colors';
import { glassEffect } from '@core/theme/glassEffect';
import { useBookStore } from '@core/store/bookStore';
import { useCardStore } from '@core/store/cardStore';
import { calculateLexPerCard } from '@core/logic/lexCalculator';
import { inventoryPresetsDB, cardsDB } from '@core/database/db';
import { InventoryFilterChip } from '@core/components/InventoryFilterChip';
import { InventoryFilterModal } from '@core/components/InventoryFilterModal';
import i18n from '@core/i18n';
import type { Card, InventoryPreset } from '@core/types';

export default function QuestScreen() {
  const router = useRouter();
  const { books, fetchBooks } = useBookStore();
  const { fetchDueCards } = useCardStore();
  const [isLoading, setIsLoading] = useState(true);
  const [dueCards, setDueCards] = useState<Card[]>([]);
  const [newCards, setNewCards] = useState<Card[]>([]);
  const [presets, setPresets] = useState<InventoryPreset[]>([]);
  const [activePresetId, setActivePresetId] = useState<number | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);

  // 画面フォーカス時に自動更新
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  useEffect(() => {
    if (books.length > 0) {
      loadDueCards();
      loadNewCards();
    }
  }, [books, activePresetId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      await fetchBooks();
      await loadPresets();
    } catch (error) {
      console.error('Failed to load quest data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPresets = async () => {
    try {
      const loadedPresets = await inventoryPresetsDB.getAll();
      setPresets(loadedPresets);
      const defaultPreset = loadedPresets.find(p => p.isDefault);
      if (defaultPreset) {
        setActivePresetId(defaultPreset.id);
      }
    } catch (error) {
      console.error('Failed to load presets:', error);
    }
  };

  const loadDueCards = async () => {
    try {
      let bookIdsToQuery: string[];

      if (activePresetId) {
        const activePreset = presets.find(p => p.id === activePresetId);
        bookIdsToQuery = activePreset?.bookIds || [];
      } else {
        bookIdsToQuery = books.filter(b => b.status === 0).map(b => b.id);
      }

      if (bookIdsToQuery.length > 0) {
        const cards = await fetchDueCards(bookIdsToQuery);
        setDueCards(cards);
      } else {
        setDueCards([]);
      }
    } catch (error) {
      console.error('Failed to load due cards:', error);
      setDueCards([]);
    }
  };

  const loadNewCards = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      let bookIdsToQuery: string[];

      if (activePresetId) {
        const activePreset = presets.find(p => p.id === activePresetId);
        bookIdsToQuery = activePreset?.bookIds || [];
      } else {
        bookIdsToQuery = books.filter(b => b.status === 0).map(b => b.id);
      }

      if (bookIdsToQuery.length > 0) {
        // 今日割り当てられた新規カード（state=0, due=today）を取得
        const allNewCards = await cardsDB.getNewCards(1000);
        const todayNewCards = allNewCards.filter(card => {
          const cardDue = new Date(card.due);
          cardDue.setHours(0, 0, 0, 0);
          return cardDue.getTime() === today.getTime() && bookIdsToQuery.includes(card.bookId);
        });
        setNewCards(todayNewCards);
      } else {
        setNewCards([]);
      }
    } catch (error) {
      console.error('Failed to load new cards:', error);
      setNewCards([]);
    }
  };

  const calculateTotalLex = (cards: Card[]) => {
    const bookModeMap = new Map(books.map(b => [b.id, b.mode]));
    return cards.reduce((total, card) => {
      const mode = bookModeMap.get(card.bookId) || 0;
      return total + calculateLexPerCard(mode);
    }, 0);
  };

  const groupCardsByBook = (cards: Card[]) => {
    const bookMap = new Map(books.map(b => [b.id, b]));
    const grouped = new Map<string, { book: typeof books[0]; cards: Card[] }>();

    cards.forEach(card => {
      const book = bookMap.get(card.bookId);
      if (book) {
        if (!grouped.has(card.bookId)) {
          grouped.set(card.bookId, { book, cards: [] });
        }
        grouped.get(card.bookId)!.cards.push(card);
      }
    });

    return Array.from(grouped.values());
  };

  const getModeLabel = (mode: 0 | 1 | 2) => {
    switch (mode) {
      case 0: return i18n.t('common.modeRead');
      case 1: return i18n.t('common.modeSolve');
      case 2: return i18n.t('common.modeMemo');
    }
  };

  const getModeColor = (mode: 0 | 1 | 2) => {
    switch (mode) {
      case 0: return colors.read;
      case 1: return colors.solve;
      case 2: return colors.memo;
    }
  };

  const startStudy = (bookId: string) => {
    router.push(`/study?bookId=${bookId}`);
  };

  const handleFilterPress = (presetId: number) => {
    setActivePresetId(activePresetId === presetId ? null : presetId);
  };

  const handleFilterLongPress = () => {
    setShowFilterModal(true);
  };

  const handlePresetsChange = async () => {
    await loadPresets();
    await loadDueCards();
  };

  if (isLoading) {
    return (
      <LinearGradient colors={[colors.background, colors.backgroundDark]} style={styles.container}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const groupedReviewCards = groupCardsByBook(dueCards);
  const groupedNewCards = groupCardsByBook(newCards);

  return (
    <LinearGradient colors={[colors.background, colors.backgroundDark]} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>{i18n.t('quest.title')}</Text>
            <TouchableOpacity onPress={() => setShowFilterModal(true)} style={styles.settingsButton}>
              <Settings color={colors.textSecondary} size={24} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {presets.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterChips}
            >
              <TouchableOpacity
                style={[styles.allChip, !activePresetId && styles.allChipActive]}
                onPress={() => setActivePresetId(null)}
              >
                <Text style={[styles.allChipText, !activePresetId && styles.allChipTextActive]}>
                  {i18n.t('quest.filterAll')}
                </Text>
              </TouchableOpacity>
              {presets.map(preset => (
                <InventoryFilterChip
                  key={preset.id}
                  preset={preset}
                  isActive={activePresetId === preset.id}
                  onPress={() => handleFilterPress(preset.id)}
                  onLongPress={handleFilterLongPress}
                />
              ))}
            </ScrollView>
          )}

          <View style={styles.summaryContainer}>
            <View style={[glassEffect.card, styles.summaryCard]}>
              <Text style={styles.summaryLabel}>復習</Text>
              <Text style={styles.summaryValue}>{dueCards.length}</Text>
              <Text style={styles.summaryLex}>+{calculateTotalLex(dueCards)} Lex</Text>
            </View>
            <View style={[glassEffect.card, styles.summaryCard]}>
              <Text style={styles.summaryLabel}>新規学習</Text>
              <Text style={styles.summaryValue}>{newCards.length}</Text>
              <Text style={styles.summaryLex}>+{calculateTotalLex(newCards)} Lex</Text>
            </View>
          </View>

          {groupedReviewCards.length === 0 && groupedNewCards.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>{i18n.t('quest.noDueCards')}</Text>
              <Text style={styles.emptySubtext}>
                {activePresetId
                  ? i18n.t('quest.noCardsInFilter')
                  : i18n.t('quest.addBooksPrompt')}
              </Text>
            </View>
          ) : (
            <>
              {groupedNewCards.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>🌱 新規学習クエスト</Text>
                  <View style={styles.taskList}>
                    {groupedNewCards.map(({ book, cards }) => (
                      <View key={book.id} style={[glassEffect.card, styles.taskCard]}>
                        <View style={styles.taskHeader}>
                          <View style={styles.taskTitleRow}>
                            <View style={[styles.modeBadge, { backgroundColor: getModeColor(book.mode) }]}>
                              <Text style={styles.modeBadgeText}>{getModeLabel(book.mode)}</Text>
                            </View>
                            <Text style={styles.taskTitle} numberOfLines={1}>
                              {book.title}
                            </Text>
                          </View>
                          <View style={styles.taskStats}>
                            <Text style={styles.taskCount}>{i18n.t('quest.cardCount', { count: cards.length })}</Text>
                            <Text style={styles.taskLex}>+{calculateLexPerCard(book.mode) * cards.length} Lex</Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          style={styles.startButton}
                          onPress={() => startStudy(book.id)}
                        >
                          <Play color={colors.text} size={20} strokeWidth={2} fill={colors.text} />
                          <Text style={styles.startButtonText}>{i18n.t('quest.start')}</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {groupedReviewCards.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>🔄 復習クエスト</Text>
                  <View style={styles.taskList}>
                    {groupedReviewCards.map(({ book, cards }) => (
                      <View key={book.id} style={[glassEffect.card, styles.taskCard]}>
                        <View style={styles.taskHeader}>
                          <View style={styles.taskTitleRow}>
                            <View style={[styles.modeBadge, { backgroundColor: getModeColor(book.mode) }]}>
                              <Text style={styles.modeBadgeText}>{getModeLabel(book.mode)}</Text>
                            </View>
                            <Text style={styles.taskTitle} numberOfLines={1}>
                              {book.title}
                            </Text>
                          </View>
                          <View style={styles.taskStats}>
                            <Text style={styles.taskCount}>{i18n.t('quest.cardCount', { count: cards.length })}</Text>
                            <Text style={styles.taskLex}>+{calculateLexPerCard(book.mode) * cards.length} Lex</Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          style={styles.startButton}
                          onPress={() => startStudy(book.id)}
                        >
                          <Play color={colors.text} size={20} strokeWidth={2} fill={colors.text} />
                          <Text style={styles.startButtonText}>{i18n.t('quest.start')}</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      <InventoryFilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        books={books}
        presets={presets}
        onPresetsChange={handlePresetsChange}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
  },
  settingsButton: {
    padding: 8,
  },
  filterChips: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  allChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  allChipActive: {
    backgroundColor: `${colors.primary}20`,
    borderColor: colors.primary,
  },
  allChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  allChipTextActive: {
    color: colors.primary,
  },
  summaryContainer: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  summaryLex: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  taskList: {
    gap: 12,
    marginHorizontal: 16,
  },
  taskCard: {
    padding: 16,
  },
  taskHeader: {
    marginBottom: 12,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  modeBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  taskTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  taskStats: {
    flexDirection: 'row',
    gap: 12,
  },
  taskCount: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  taskLex: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
});
