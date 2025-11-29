import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { RotateCcw, AlertTriangle, CheckCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '@core/theme/colors';
import { glassEffect } from '@core/theme/glassEffect';
import type { Card, Book } from '@core/types';
import { createScheduler } from '@core/fsrs/scheduler';
import { DrizzleCardRepository } from '@core/repository/CardRepository';

interface GlobalNextCardProps {
  globalNext: Card | null;
  globalNextBook: Book | null;
  dueCount: number;
  onReviewComplete: () => Promise<void>;
}

export function GlobalNextCard({
  globalNext,
  globalNextBook,
  dueCount,
  onReviewComplete,
}: GlobalNextCardProps) {
  const cardRepo = new DrizzleCardRepository();

  const handleReview = async (rating: 'again' | 'hard' | 'good') => {
    if (!globalNext || !globalNextBook) return;

    try {
      const scheduler = createScheduler(globalNextBook.mode);
      let updated: Card;
      
      switch (rating) {
        case 'again':
          updated = scheduler.reviewAgain(globalNext);
          Haptics.selectionAsync();
          break;
        case 'hard':
          updated = scheduler.reviewHard(globalNext);
          Haptics.selectionAsync();
          break;
        case 'good':
          updated = scheduler.reviewGood(globalNext);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          if (dueCount - 1 <= 0) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
          break;
      }

      await cardRepo.update(updated.id, updated);
      await onReviewComplete();
    } catch (e) {
      console.error(`Global review ${rating} failed`, e);
    }
  };

  return (
    <View style={[glassEffect.card, styles.card]}>
      {globalNext && globalNextBook ? (
        <View style={styles.content}>
          <Text style={styles.title}>{globalNextBook.title}</Text>
          {(() => {
            const chunkSize = globalNextBook.chunkSize && globalNextBook.chunkSize > 0 ? globalNextBook.chunkSize : 1;
            const start = (globalNext.unitIndex - 1) * chunkSize + 1;
            const end = Math.min(globalNext.unitIndex * chunkSize, globalNextBook.totalUnit);
            return (
              <Text style={styles.subtitle}>
                学習単位 {globalNext.unitIndex}
                {chunkSize > 1 ? ` (${start}–${end})` : ''}
              </Text>
            );
          })()}
          <Text style={styles.hint}>学習単位＝書籍を chunkSize({globalNextBook.chunkSize || 1}) ごとに区切ったまとまり</Text>
          <View style={styles.buttons}>
            {globalNextBook.mode === 1 ? (
              // Solveモードは従来の3ボタン（again/hard/good）
              <>
                <TouchableOpacity
                  style={[styles.button, styles.buttonAgain]}
                  onPress={() => handleReview('again')}
                >
                  <RotateCcw size={16} color={colors.text} />
                  <Text style={styles.buttonText}>もう一度</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.buttonHard]}
                  onPress={() => handleReview('hard')}
                >
                  <AlertTriangle size={16} color={colors.text} />
                  <Text style={styles.buttonText}>難しい</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.buttonGood]}
                  onPress={() => handleReview('good')}
                >
                  <CheckCircle size={16} color={colors.text} />
                  <Text style={styles.buttonText}>できた</Text>
                </TouchableOpacity>
              </>
            ) : (
              // Read/Memoは2ボタン（again/good）
              <>
                <TouchableOpacity
                  style={[styles.button, styles.buttonAgain, { flex: 1 }]}
                  onPress={() => handleReview('again')}
                >
                  <RotateCcw size={18} color={colors.text} />
                  <Text style={styles.buttonText}>忘れた</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.buttonGood, { flex: 1 }]}
                  onPress={() => handleReview('good')}
                >
                  <CheckCircle size={18} color={colors.text} />
                  <Text style={styles.buttonText}>覚えてる</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      ) : (
        <Text style={styles.done}>今日の復習は全て完了しました 🎉</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginHorizontal: 16,
  },
  content: {
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  hint: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  buttons: {
    flexDirection: 'row',
    gap: 6,
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  buttonAgain: {
    backgroundColor: '#552222',
  },
  buttonHard: {
    backgroundColor: '#554d22',
  },
  buttonGood: {
    backgroundColor: '#225522',
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  done: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '600',
  },
});
