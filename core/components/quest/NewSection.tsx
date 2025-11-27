import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Play } from 'lucide-react-native';
import { colors } from '@core/theme/colors';
import { glassEffect } from '@core/theme/glassEffect';
import type { Book } from '@core/types';

interface NewSectionProps {
  newDeemphasized: boolean;
  hasReviewPending: boolean;
  targetLex: number;
  combinedLex: number;
  recommendedTotal: number;
  recommendedPerBook: Record<string, number>;
  groupedNewCards: { book: Book; cards: any[] }[];
  onAssignRecommended: () => Promise<void>;
}

export function NewSection({
  newDeemphasized,
  hasReviewPending,
  targetLex,
  combinedLex,
  recommendedTotal,
  recommendedPerBook,
  groupedNewCards,
  onAssignRecommended,
}: NewSectionProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // デバッグ情報
  console.log('[NewSection] Debug:', {
    targetLex,
    combinedLex,
    deficit: targetLex - combinedLex,
    recommendedTotal,
    recommendedPerBook,
    hasReviewPending,
    newDeemphasized,
  });

  const deficit = Math.max(0, targetLex - combinedLex);
  const isTargetMet = deficit === 0;

  return (
    <View style={[hasReviewPending && styles.dimSection]}>
      <Text style={styles.title}>🌱 新規{hasReviewPending ? '（復習完了後に推奨）' : ''}</Text>
      <View style={[glassEffect.card, styles.card]}>
        {isTargetMet ? (
          <Text style={styles.shortage}>✅ 目標達成！ さらに {recommendedTotal} 枚追加可能</Text>
        ) : (
          <Text style={styles.shortage}>不足 {deficit} Lex / 推奨 {recommendedTotal} 枚</Text>
        )}
        <TouchableOpacity
          style={[styles.button, (recommendedTotal === 0 || hasReviewPending) && { opacity: 0.5 }]}
          disabled={recommendedTotal === 0 || hasReviewPending}
          onPress={onAssignRecommended}
        >
          <Play color={colors.text} size={20} strokeWidth={2} fill={colors.text} />
          <Text style={styles.buttonText}>{isTargetMet ? '追加で割り当てる' : '推奨を割り当てる'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toggle} onPress={() => setShowAdvanced(p => !p)}>
          <Text style={styles.toggleText}>{showAdvanced ? '詳細を閉じる' : '書籍別を見る'}</Text>
        </TouchableOpacity>
      </View>
      {showAdvanced && groupedNewCards.length > 0 && (
        <View style={styles.list}>
          {groupedNewCards.map(({ book, cards }) => (
            <View key={book.id} style={[glassEffect.card, styles.bookCard]}>
              <Text style={styles.bookTitle} numberOfLines={1}>{book.title}</Text>
              <Text style={styles.bookCount}>割り当て済 {cards.length} 枚 / 推奨 {(recommendedPerBook[book.id] || 0)} 枚</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dimSection: {
    opacity: 0.6,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  card: {
    padding: 16,
    marginHorizontal: 16,
  },
  shortage: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  toggle: {
    marginTop: 12,
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
