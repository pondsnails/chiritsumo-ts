import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Play } from 'lucide-react-native';
import { colors } from '@/app/core/theme/colors';
import { glassEffect } from '@/app/core/theme/glassEffect';
import { useBookStore } from '@/app/core/store/bookStore';
import { useCardStore } from '@/app/core/store/cardStore';
import { calculateLexPerCard } from '@/app/core/logic/lexCalculator';
import type { Card } from '@/app/core/types';

export default function QuestScreen() {
  const router = useRouter();
  const { books, fetchBooks } = useBookStore();
  const { fetchDueCards } = useCardStore();
  const [isLoading, setIsLoading] = useState(true);
  const [dueCards, setDueCards] = useState<Card[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      await fetchBooks();
      const activeBookIds = books.filter(b => b.status === 0).map(b => b.id);
      if (activeBookIds.length > 0) {
        const cards = await fetchDueCards(activeBookIds);
        setDueCards(cards);
      }
    } catch (error) {
      console.error('Failed to load quest data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotalLex = () => {
    const bookModeMap = new Map(books.map(b => [b.id, b.mode]));
    return dueCards.reduce((total, card) => {
      const mode = bookModeMap.get(card.bookId) || 0;
      return total + calculateLexPerCard(mode);
    }, 0);
  };

  const groupCardsByBook = () => {
    const bookMap = new Map(books.map(b => [b.id, b]));
    const grouped = new Map<string, { book: typeof books[0]; cards: Card[] }>();

    dueCards.forEach(card => {
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
      case 0: return '読';
      case 1: return '解';
      case 2: return '暗';
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

  const groupedCards = groupCardsByBook();

  return (
    <LinearGradient colors={[colors.background, colors.backgroundDark]} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Quest</Text>

          <View style={styles.summaryContainer}>
            <View style={[glassEffect.card, styles.summaryCard]}>
              <Text style={styles.summaryLabel}>待機中のカード</Text>
              <Text style={styles.summaryValue}>{dueCards.length}</Text>
            </View>
            <View style={[glassEffect.card, styles.summaryCard]}>
              <Text style={styles.summaryLabel}>獲得予定Lex</Text>
              <Text style={styles.summaryValue}>{calculateTotalLex()}</Text>
            </View>
          </View>

          {groupedCards.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>学習待機中のカードはありません</Text>
              <Text style={styles.emptySubtext}>Books画面から教材を追加してください</Text>
            </View>
          ) : (
            <View style={styles.taskList}>
              {groupedCards.map(({ book, cards }) => (
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
                      <Text style={styles.taskCount}>{cards.length}枚</Text>
                      <Text style={styles.taskLex}>+{calculateLexPerCard(book.mode) * cards.length} Lex</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.startButton}
                    onPress={() => startStudy(book.id)}
                  >
                    <Play color={colors.text} size={20} strokeWidth={2} fill={colors.text} />
                    <Text style={styles.startButtonText}>開始</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
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
    paddingBottom: 120,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginHorizontal: 16,
    marginBottom: 16,
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
