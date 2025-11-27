import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ArrowLeft, Search, Filter } from 'lucide-react-native';
import { DrizzleCardRepository } from '@core/repository/CardRepository';
import { useBookStore } from '@core/store/bookStore';
import { colors } from '@core/theme/colors';
import { glassEffect } from '@core/theme/glassEffect';
import type { Card } from '@core/types';

type SortKey = 'due' | 'stability' | 'difficulty' | 'unitIndex';
type FilterState = 'all' | 0 | 1 | 2 | 3; // all or card states

const PAGE_SIZE = 50; // ページあたりのカード数
const cardRepo = new DrizzleCardRepository();

export default function CardListScreen() {
  const router = useRouter();
  const [cards, setCards] = useState<Card[]>([]);
  const { books } = useBookStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('due');
  const [filterState, setFilterState] = useState<FilterState>('all');
  const [filterBookId, setFilterBookId] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  // カードをロード
  const loadCards = useCallback(async (reset: boolean = false) => {
    if (reset) {
      setPage(0);
      setCards([]);
      setHasMore(true);
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const bookId = filterBookId === 'all' ? undefined : filterBookId;
      const state = filterState === 'all' ? undefined : filterState;
      const offset = reset ? 0 : page * PAGE_SIZE;

      const newCards = await cardRepo.findPaginated(PAGE_SIZE, offset, bookId, state);
      
      if (reset) {
        setCards(newCards);
      } else {
        setCards(prev => [...prev, ...newCards]);
      }

      setHasMore(newCards.length === PAGE_SIZE);
      if (!reset) setPage(prev => prev + 1);
    } catch (error) {
      console.error('Failed to load cards:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [page, filterBookId, filterState]);

  useEffect(() => {
    loadCards(true);
  }, [filterBookId, filterState]);

  const handleLoadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      loadCards(false);
    }
  }, [isLoadingMore, hasMore, loadCards]);

  // 記憶定着率を計算（FSRS v5の忘却曲線）
  const calculateRetrievability = useCallback((card: Card): number => {
    if (card.stability === 0) return 0;
    const retrievability = Math.pow(1 + card.elapsedDays / (9 * card.stability), -1);
    return Math.round(retrievability * 100);
  }, []);

  // 次回復習までの日数
  const getDaysUntilDue = useCallback((card: Card): number => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const due = new Date(card.due);
    due.setHours(0, 0, 0, 0);
    return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }, []);

  // 書籍マップをメモ化
  const bookMap = useMemo(() => {
    return new Map(books.map(b => [b.id, b]));
  }, [books]);

  // フィルタリングとソートをメモ化
  const filteredCards = useMemo(() => {
    return cards
      .filter(card => {
        // 書籍フィルター
        if (filterBookId !== 'all' && card.bookId !== filterBookId) return false;

        // 状態フィルター
        if (filterState !== 'all' && card.state !== filterState) return false;

        // 検索クエリ
        if (searchQuery) {
          const book = bookMap.get(card.bookId);
          const bookTitle = book?.title.toLowerCase() || '';
          const query = searchQuery.toLowerCase();
          return bookTitle.includes(query) || card.id.toLowerCase().includes(query);
        }

        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'due':
            return a.due - b.due;
          case 'stability':
            return b.stability - a.stability;
          case 'difficulty':
            return b.difficulty - a.difficulty;
          case 'unitIndex':
            return a.unitIndex - b.unitIndex;
          default:
            return 0;
        }
      });
  }, [cards, filterState, filterBookId, searchQuery, sortBy, bookMap]);

  // 状態別カウントをメモ化
  const stateCounts = useMemo(() => ({
    all: cards.length,
    new: cards.filter(c => c.state === 0).length,
    learning: cards.filter(c => c.state === 1).length,
    review: cards.filter(c => c.state === 2).length,
    relearning: cards.filter(c => c.state === 3).length,
  }), [cards]);

  const getStateLabel = (state: 0 | 1 | 2 | 3): string => {
    switch (state) {
      case 0: return 'New';
      case 1: return 'Learning';
      case 2: return 'Review';
      case 3: return 'Relearning';
    }
  };

  const getStateColor = (state: 0 | 1 | 2 | 3): string => {
    switch (state) {
      case 0: return colors.textTertiary;
      case 1: return colors.warning;
      case 2: return colors.success;
      case 3: return colors.error;
    }
  };

  // カードアイテムのレンダリング関数
  const renderCardItem = useCallback(({ item: card }: { item: Card }) => {
    const book = bookMap.get(card.bookId);
    const retrievability = calculateRetrievability(card);
    const daysUntil = getDaysUntilDue(card);

    return (
      <TouchableOpacity
        style={[glassEffect.container, styles.cardItem]}
        onPress={() => router.push(`/cards/edit?cardId=${card.id}&bookId=${card.bookId}` as any)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.bookTitle} numberOfLines={1}>
              {book?.title || 'Unknown Book'}
            </Text>
            <View style={[styles.stateBadge, { backgroundColor: getStateColor(card.state) + '20' }]}>
              <Text style={[styles.stateText, { color: getStateColor(card.state) }]}>
                {getStateLabel(card.state)}
              </Text>
            </View>
          </View>
          <Text style={styles.cardId}>
            Unit {card.unitIndex} • ID: {card.id.split('_')[1]}
          </Text>
        </View>

        <View style={styles.metricsGrid}>
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>記憶定着率</Text>
            <Text style={styles.metricValue}>{retrievability}%</Text>
            <Text style={styles.metricFormula}>
              (1 + {card.elapsedDays}/(9×{card.stability.toFixed(2)}))⁻¹
            </Text>
          </View>

          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>安定性 (S)</Text>
            <Text style={styles.metricValue}>{card.stability.toFixed(2)}</Text>
            <Text style={styles.metricFormula}>日数</Text>
          </View>

          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>難易度 (D)</Text>
            <Text style={styles.metricValue}>{card.difficulty.toFixed(2)}</Text>
            <Text style={styles.metricFormula}>0-10</Text>
          </View>
        </View>

        <View style={styles.detailsGrid}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>経過日数:</Text>
            <Text style={styles.detailValue}>{card.elapsedDays}日</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>予定間隔:</Text>
            <Text style={styles.detailValue}>{card.scheduledDays}日</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>復習回数:</Text>
            <Text style={styles.detailValue}>{card.reps}回</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>失敗回数:</Text>
            <Text style={styles.detailValue}>{card.lapses}回</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>次回復習:</Text>
            <Text style={[styles.detailValue, daysUntil < 0 && { color: colors.error }]}>
              {daysUntil < 0 ? `${Math.abs(daysUntil)}日遅延` : `${daysUntil}日後`}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>復習日時:</Text>
            <Text style={styles.detailValue}>
              {new Date(card.due).toLocaleDateString('ja-JP')}
            </Text>
          </View>
          {card.lastReview && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>前回復習:</Text>
              <Text style={styles.detailValue}>
                {new Date(card.lastReview).toLocaleDateString('ja-JP')}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [bookMap, calculateRetrievability, getDaysUntilDue, router]);

  const keyExtractor = useCallback((item: Card) => item.id, []);

  if (isLoading) {
    return (
      <LinearGradient colors={[colors.background, colors.backgroundDark]} style={styles.container}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>カードを読み込み中...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[colors.background, colors.backgroundDark]} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft color={colors.text} size={24} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.title}>カード一覧</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Search color={colors.textTertiary} size={20} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="書籍名で検索..."
              placeholderTextColor={colors.textTertiary}
            />
          </View>
        </View>

        <View style={styles.filterSection}>
          <Text style={styles.filterSectionTitle}>書籍</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
            <TouchableOpacity
              style={[styles.filterChip, filterBookId === 'all' && styles.filterChipActive]}
              onPress={() => setFilterBookId('all')}
            >
              <Text style={[styles.filterText, filterBookId === 'all' && styles.filterTextActive]}>
                全書籍
              </Text>
            </TouchableOpacity>
            {books.map(book => (
              <TouchableOpacity
                key={book.id}
                style={[styles.filterChip, filterBookId === book.id && styles.filterChipActive]}
                onPress={() => setFilterBookId(book.id)}
              >
                <Text
                  style={[styles.filterText, filterBookId === book.id && styles.filterTextActive]}
                  numberOfLines={1}
                >
                  {book.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.filterSection}>
          <Text style={styles.filterSectionTitle}>学習状態</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, filterState === 'all' && styles.filterChipActive]}
            onPress={() => setFilterState('all')}
          >
            <Text style={[styles.filterText, filterState === 'all' && styles.filterTextActive]}>
              全て ({stateCounts.all})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filterState === 0 && styles.filterChipActive]}
            onPress={() => setFilterState(0)}
          >
            <Text style={[styles.filterText, filterState === 0 && styles.filterTextActive]}>
              New ({stateCounts.new})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filterState === 1 && styles.filterChipActive]}
            onPress={() => setFilterState(1)}
          >
            <Text style={[styles.filterText, filterState === 1 && styles.filterTextActive]}>
              Learning ({stateCounts.learning})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filterState === 2 && styles.filterChipActive]}
            onPress={() => setFilterState(2)}
          >
            <Text style={[styles.filterText, filterState === 2 && styles.filterTextActive]}>
              Review ({stateCounts.review})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filterState === 3 && styles.filterChipActive]}
            onPress={() => setFilterState(3)}
          >
            <Text style={[styles.filterText, filterState === 3 && styles.filterTextActive]}>
              Relearning ({stateCounts.relearning})
            </Text>
          </TouchableOpacity>
          </ScrollView>
        </View>

        <View style={styles.sortRow}>
          <Text style={styles.sortLabel}>並び替え:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[styles.sortButton, sortBy === 'due' && styles.sortButtonActive]}
              onPress={() => setSortBy('due')}
            >
              <Text style={[styles.sortButtonText, sortBy === 'due' && styles.sortButtonTextActive]}>
                復習日
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sortButton, sortBy === 'stability' && styles.sortButtonActive]}
              onPress={() => setSortBy('stability')}
            >
              <Text style={[styles.sortButtonText, sortBy === 'stability' && styles.sortButtonTextActive]}>
                安定性
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sortButton, sortBy === 'difficulty' && styles.sortButtonActive]}
              onPress={() => setSortBy('difficulty')}
            >
              <Text style={[styles.sortButtonText, sortBy === 'difficulty' && styles.sortButtonTextActive]}>
                難易度
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sortButton, sortBy === 'unitIndex' && styles.sortButtonActive]}
              onPress={() => setSortBy('unitIndex')}
            >
              <Text style={[styles.sortButtonText, sortBy === 'unitIndex' && styles.sortButtonTextActive]}>
                ページ順
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <FlatList
          data={filteredCards}
          renderItem={renderCardItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.cardList}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingMoreText}>読み込み中...</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            isLoading ? null : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>カードが見つかりません</Text>
              </View>
            )
          }
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  filterSection: {
    marginBottom: 12,
  },
  filterSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  filterRow: {
    paddingHorizontal: 16,
    maxHeight: 44,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.primary,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  sortLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginRight: 8,
  },
  sortButtonActive: {
    backgroundColor: colors.warning + '20',
    borderColor: colors.warning,
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  sortButtonTextActive: {
    color: colors.warning,
  },
  cardList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  cardItem: {
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    marginBottom: 16,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  bookTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginRight: 8,
  },
  stateBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stateText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardId: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  metricBox: {
    flex: 1,
    backgroundColor: colors.surface + '80',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10,
    color: colors.textTertiary,
    marginBottom: 4,
    textAlign: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  metricFormula: {
    fontSize: 9,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  detailsGrid: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  emptyState: {
    paddingVertical: 64,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textTertiary,
  },
  loadingMore: {
    paddingVertical: 20,
    alignItems: 'center',
    gap: 8,
  },
  loadingMoreText: {
    fontSize: 12,
    color: colors.textTertiary,
  },
});
