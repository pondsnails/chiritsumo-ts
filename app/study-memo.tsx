import React, { useEffect, useState } from 'react';
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
import { useServices } from '@core/di/ServicesProvider';
import { useCardStore } from '@core/store/cardStore';
import { useBookStore } from '@core/store/bookStore';
import { colors } from '@core/theme/colors';
import { glassEffect } from '@core/theme/glassEffect';
import i18n from '@core/i18n';
import type { Card, Book } from '@core/types';

export default function StudyMemoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { cardRepo } = useServices();
  const { books } = useBookStore();
  const { fetchDueCards, bulkUpdateCardReviews } = useCardStore();
  const [cards, setCards] = useState<Card[]>([]);
  const [failedIndices, setFailedIndices] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentBook, setCurrentBook] = useState<Book | null>(null);

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    try {
      setIsLoading(true);
      const bookId = params.bookId as string;

      if (!bookId) {
        router.back();
        return;
      }

      const book = books.find((b) => b.id === bookId);
      setCurrentBook(book || null);

      const dueCards = await fetchDueCards(cardRepo, [bookId]);
      setCards(dueCards);
    } catch (error) {
      console.error('Failed to load cards:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCardState = (index: number) => {
    setFailedIndices((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleSubmit = async () => {
    if (!currentBook) return;

    try {
      setIsSubmitting(true);

      const ratings = cards.map((_, index) => {
        return failedIndices.has(index) ? 1 : 3;
      });

      await bulkUpdateCardReviews(cards, ratings as (1 | 2 | 3 | 4)[], currentBook.mode);

      const passedCount = cards.length - failedIndices.size;
      const failedCount = failedIndices.size;

      Alert.alert(
        i18n.t('study.completed'),
        `${i18n.t('common.success')}: ${passedCount}枚\n${i18n.t('common.error')}: ${failedCount}枚`,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Failed to submit reviews:', error);
      Alert.alert(i18n.t('common.error'), i18n.t('study.reviewSaveError'));
    } finally {
      setIsSubmitting(false);
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
          <Text style={styles.emptyText}>{i18n.t('study.noCards')}</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>{i18n.t('study.back')}</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[colors.background, colors.backgroundDark]} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={styles.bookTitle}>{currentBook?.title}</Text>
          <Text style={styles.instruction}>{i18n.t('study.instruction')}</Text>
          <View style={styles.stats}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>{i18n.t('study.correct')}</Text>
              <Text style={[styles.statValue, { color: colors.success }]}>
                {cards.length - failedIndices.size}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>{i18n.t('study.incorrect')}</Text>
              <Text style={[styles.statValue, { color: colors.error }]}>{failedIndices.size}</Text>
            </View>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.grid}>
            {cards.map((card, index) => {
              const isFailed = failedIndices.has(index);
              return (
                <TouchableOpacity
                  key={card.id}
                  style={[
                    styles.gridItem,
                    isFailed ? styles.gridItemFailed : styles.gridItemPass,
                  ]}
                  onPress={() => toggleCardState(index)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.gridItemText,
                      isFailed ? styles.gridItemTextFailed : styles.gridItemTextPass,
                    ]}
                  >
                    {card.unitIndex}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={styles.submitButtonText}>{i18n.t('study.completed')}</Text>
            )}
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
    paddingBottom: 8,
  },
  bookTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  instruction: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  stats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textTertiary,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridItem: {
    width: '18%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 2,
  },
  gridItemPass: {
    backgroundColor: 'transparent',
    borderColor: colors.success,
  },
  gridItemFailed: {
    backgroundColor: colors.error,
    borderColor: colors.error,
  },
  gridItemText: {
    fontSize: 16,
    fontWeight: '600',
  },
  gridItemTextPass: {
    color: colors.success,
  },
  gridItemTextFailed: {
    color: colors.text,
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    ...glassEffect,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
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
