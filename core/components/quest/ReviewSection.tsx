import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '@core/theme/colors';
import { glassEffect } from '@core/theme/glassEffect';
import ProgressBar from '@core/components/ProgressBar';
import { GlobalNextCard } from './GlobalNextCard';
import type { Card, Book } from '@core/types';

interface ReviewSectionProps {
  dueCards: Card[];
  initialDueCount: number;
  groupedReviewCards: { book: Book; cards: Card[] }[];
  globalNext: Card | null;
  globalNextBook: Book | null;
  onReviewComplete: () => Promise<void>;
}

export function ReviewSection({
  dueCards,
  initialDueCount,
  groupedReviewCards,
  globalNext,
  globalNextBook,
  onReviewComplete,
}: ReviewSectionProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <View style={styles.section}>
      <Text style={styles.title}>🔄 復習（何も考えず評価するだけ）</Text>
      <View style={styles.progressWrap}>
        <ProgressBar value={initialDueCount === 0 ? 0 : (initialDueCount - dueCards.length) / Math.max(1, initialDueCount)} />
        <Text style={styles.progressLabel}>残り {dueCards.length} / 初期 {initialDueCount}</Text>
      </View>
      <GlobalNextCard
        globalNext={globalNext}
        globalNextBook={globalNextBook}
        dueCount={dueCards.length}
        onReviewComplete={onReviewComplete}
      />
      <TouchableOpacity
        style={styles.toggle}
        onPress={() => setShowAdvanced(prev => !prev)}
      >
        <Text style={styles.toggleText}>
          {showAdvanced ? '詳細を閉じる' : '書籍別の残りを見る'}
        </Text>
      </TouchableOpacity>
      {showAdvanced && (
        <View style={styles.list}>
          {groupedReviewCards.map(({ book, cards }) => {
            const now = new Date();
            const dueList = cards.filter(c => c.due <= now);
            return (
              <View key={book.id} style={[glassEffect.card, styles.bookCard]}>
                <Text style={styles.bookTitle} numberOfLines={1}>{book.title}</Text>
                <Text style={styles.bookCount}>残り {dueList.length} 枚</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  progressWrap: {
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 4,
  },
  progressLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  toggle: {
    marginTop: 12,
    marginHorizontal: 16,
    alignSelf: 'flex-end',
  },
  toggleText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  list: {
    gap: 12,
    marginHorizontal: 16,
    marginTop: 12,
  },
  bookCard: {
    padding: 12,
    gap: 4,
  },
  bookTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  bookCount: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
