import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useCardStore } from '@/app/core/store/cardStore';
import { useBookStore } from '@/app/core/store/bookStore';
import { colors } from '@/app/core/theme/colors';
import type { Card, Book } from '@/app/core/types';

const { width } = Dimensions.get('window');

export default function StudyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { fetchDueCards, updateCardReview } = useCardStore();
  const { books } = useBookStore();
  const [cards, setCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [currentBook, setCurrentBook] = useState<Book | null>(null);

  useEffect(() => {
    loadCards();
  }, []);

  useEffect(() => {
    if (cards.length > 0 && currentIndex < cards.length) {
      const card = cards[currentIndex];
      const book = books.find((b) => b.id === card.bookId);
      setCurrentBook(book || null);
    }
  }, [currentIndex, cards, books]);

  const loadCards = async () => {
    try {
      setIsLoading(true);
      const bookIds = params.bookIds
        ? (params.bookIds as string).split(',')
        : params.bookId
          ? [params.bookId as string]
          : [];

      if (bookIds.length === 0) {
        router.back();
        return;
      }

      const dueCards = await fetchDueCards(bookIds);
      setCards(dueCards);
    } catch (error) {
      console.error('Failed to load cards:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReview = async (rating: 1 | 3) => {
    if (!currentBook || currentIndex >= cards.length) return;

    try {
      const card = cards[currentIndex];
      await updateCardReview(card.id, card.bookId, rating, currentBook.mode);

      if (currentIndex < cards.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        router.back();
      }
    } catch (error) {
      console.error('Failed to update card:', error);
    }
  };

  if (isLoading) {
    return (
      <LinearGradient colors={[colors.background, colors.backgroundDark]} style={styles.container}>
        <SafeAreaView style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (cards.length === 0) {
    return (
      <LinearGradient colors={[colors.background, colors.backgroundDark]} style={styles.container}>
        <SafeAreaView style={styles.center}>
          <Text style={styles.emptyText}>学習カードがありません</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>戻る</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const currentCard = cards[currentIndex];
  const progress = ((currentIndex + 1) / cards.length) * 100;

  return (
    <LinearGradient colors={[colors.background, colors.backgroundDark]} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {currentIndex + 1} / {cards.length}
          </Text>
        </View>

        <View style={styles.content}>
          <View style={styles.cardContainer}>
            <Text style={styles.bookTitle}>{currentBook?.title}</Text>
            <Text style={styles.unitText}>問題 {currentCard.unitIndex}</Text>

            <View style={styles.cardInfo}>
              <Text style={styles.infoLabel}>復習回数</Text>
              <Text style={styles.infoValue}>{currentCard.reps}</Text>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.error }]}
            onPress={() => handleReview(1)}
          >
            <Text style={styles.actionButtonText}>もう一度</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.success }]}
            onPress={() => handleReview(3)}
          >
            <Text style={styles.actionButtonText}>できた</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.surface,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  progressText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  cardContainer: {
    width: '100%',
    backgroundColor: colors.surface,
    borderColor: colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  bookTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  unitText: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary,
    marginVertical: 24,
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 16,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textTertiary,
    marginBottom: 24,
  },
  backButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderColor: colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: 8,
  },
  backButtonText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 14,
  },
});
