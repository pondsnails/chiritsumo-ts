import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ChevronRight, BookOpen } from 'lucide-react-native';
import { useServices } from '@core/di/ServicesProvider';
import { useCardStore } from '@core/store/cardStore';
import { useBookStore } from '@core/store/bookStore';
import { reportError } from '@core/services/errorReporter';
import { colors } from '@core/theme/colors';
import { glassEffect } from '@core/theme/glassEffect';
import i18n from '@core/i18n';
import type { Card, Book } from '@core/types';

interface BookCardGroup {
  book: Book;
  cards: Card[];
}

export default function StudyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { cardRepo, bookRepo } = useServices();
  const { books } = useBookStore();
  const { fetchDueCards } = useCardStore();
  
  const [bookCardGroups, setBookCardGroups] = useState<BookCardGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    try {
      setIsLoading(true);
      const targetBookIds = params.bookIds
        ? (params.bookIds as string).split(',')
        : params.bookId
          ? [params.bookId as string]
          : [];

      if (targetBookIds.length === 0) {
        router.back();
        return;
      }

      const dueCards = await fetchDueCards(cardRepo, targetBookIds);
      
      // 書籍ごとにカードをグループ化
      const groups: BookCardGroup[] = targetBookIds
        .map(bookId => {
          const book = books.find(b => b.id === bookId);
          const bookCards = dueCards.filter(c => c.bookId === bookId);
          return book ? { book, cards: bookCards } : null;
        })
        .filter((g): g is BookCardGroup => g !== null && g.cards.length > 0);

      setBookCardGroups(groups);
    } catch (error) {
      reportError(error, { context: 'study:loadCards' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartBook = (bookId: string) => {
    router.push(`/study-memo?bookId=${bookId}` as any);
  };

  const totalCards = useMemo(() => {
    return bookCardGroups.reduce((sum, group) => sum + group.cards.length, 0);
  }, [bookCardGroups]);

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

  if (bookCardGroups.length === 0) {
    return (
      <LinearGradient colors={[colors.background, colors.backgroundDark]} style={styles.container}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft color={colors.text} size={24} strokeWidth={2} />
            </TouchableOpacity>
            <Text style={styles.title}>学習</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{i18n.t('study.noCards')}</Text>
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
          <Text style={styles.title}>学習</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.summary}>
          <Text style={styles.summaryText}>
            {bookCardGroups.length}冊 • 合計{totalCards}枚のカード
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {bookCardGroups.map((group, index) => (
            <TouchableOpacity
              key={group.book.id}
              style={[glassEffect.container, styles.bookCard]}
              onPress={() => handleStartBook(group.book.id)}
              activeOpacity={0.7}
            >
              <View style={styles.bookCardContent}>
                <View style={styles.bookCardLeft}>
                  <BookOpen color={colors.primary} size={24} strokeWidth={2} />
                  <View style={styles.bookCardInfo}>
                    <Text style={styles.bookCardTitle} numberOfLines={2}>
                      {group.book.title}
                    </Text>
                    <Text style={styles.bookCardSubtitle}>
                      {group.cards.length}枚のカード
                    </Text>
                  </View>
                </View>
                <ChevronRight color={colors.textTertiary} size={20} strokeWidth={2} />
              </View>
              
              <View style={styles.bookCardFooter}>
                <View style={styles.bookCardBadge}>
                  <Text style={styles.bookCardBadgeText}>
                    {index + 1}/{bookCardGroups.length}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
  summary: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  summaryText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  bookCard: {
    padding: 16,
    marginBottom: 12,
  },
  bookCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bookCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  bookCardInfo: {
    flex: 1,
  },
  bookCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  bookCardSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  bookCardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  bookCardBadge: {
    backgroundColor: colors.primary + '20',
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bookCardBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
});
