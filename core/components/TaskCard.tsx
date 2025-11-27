import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { ChevronRight, Clock } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { glassEffect } from '../theme/glassEffect';
import { getModeColor, getModeIcon, getModeShortLabel } from '../utils/uiHelpers';
import type { Book } from '../types';

interface TaskCardProps {
  book: Book;
  cardsDue: number;
  estimatedLex: number;
  index: number;
  onPress: () => void;
  onSkip?: () => void;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function TaskCard({ book, cardsDue, estimatedLex, index, onPress, onSkip }: TaskCardProps) {
  return (
    <AnimatedTouchable
      entering={FadeInUp.delay(index * 100).springify()}
      onPress={onPress}
      style={styles.container}
    >
      <View style={[glassEffect.card, styles.card]}>
        <View style={styles.content}>
          <View style={[styles.modeBadge, { backgroundColor: getModeColor(book.mode) }]}>
            <Text style={styles.modeBadgeText}>
              {getModeIcon(book.mode)}
            </Text>
          </View>

          <View style={styles.textContent}>
            <Text style={styles.title} numberOfLines={2}>
              {book.title}
            </Text>

            <View style={styles.infoRow}>
              <View style={styles.badge}>
                <Clock color={colors.primary} size={12} strokeWidth={2} />
                <Text style={styles.badgeText}>残り {cardsDue}枚</Text>
              </View>

              <View style={[styles.badge, styles.lexBadge]}>
                <Text style={styles.lexText}>+{estimatedLex} Lex</Text>
              </View>
            </View>

            <Text style={styles.modeLabel}>{getModeShortLabel(book.mode)}</Text>
          </View>

          <ChevronRight color={colors.textSecondary} size={24} strokeWidth={2} />
        </View>

        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${book.totalUnit > 0 ? ((book.completedUnit || 0) / book.totalUnit) * 100 : 0}%`,
                backgroundColor: getModeColor(book.mode),
              },
            ]}
          />
        </View>
      </View>
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    marginHorizontal: 16,
  },
  card: {
    padding: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  modeBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modeBadgeText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  textContent: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  lexBadge: {
    backgroundColor: 'rgba(0, 212, 255, 0.15)',
  },
  lexText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '700',
  },
  modeLabel: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.surface,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});
