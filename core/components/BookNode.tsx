import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Lock, Crown } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { glassEffect } from '../theme/glassEffect';
import type { Book } from '../types';
import { PressableScale } from './PressableScale';

interface BookNodeProps {
  book: Book;
  isHub?: boolean;
  hubCount?: number;
  onPress: () => void;
  onLongPress?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(PressableScale as any);

export function BookNode({ book, isHub, hubCount, onPress, onLongPress }: BookNodeProps) {
  const getStatusStyle = () => {
    if (book.status === 0) {
      return {
        borderColor: colors.success,
        opacity: 1,
      };
    }
    if (book.status === 1) {
      return {
        borderColor: colors.warning,
        opacity: 1,
      };
    }
    return {
      borderColor: colors.surfaceBorder,
      opacity: 0.5,
    };
  };

  const getModeColor = () => {
    if (book.mode === 0) return colors.read;
    if (book.mode === 1) return colors.solve;
    return colors.memo;
  };

  const isLocked = book.status === 2;
  const isCompleted = book.status === 1;

  if (isHub) {
    return (
      <Animated.View entering={FadeInUp.springify()} style={styles.hubContainer}>
        <PressableScale onPress={onPress}>
          <View style={[glassEffect.card, styles.hubNode]}>
            <View style={styles.hubContent}>
              <Text style={styles.hubText}>他{hubCount}冊</Text>
              <Text style={styles.hubSubtext}>タップして表示</Text>
            </View>
          </View>
        </PressableScale>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeInUp.delay(60).springify()} style={styles.nodeContainer}>
      <PressableScale onPress={onPress} onLongPress={onLongPress} delayLongPress={500}>
      <View
        style={[
          glassEffect.card,
          styles.node,
          { borderColor: getStatusStyle().borderColor, opacity: getStatusStyle().opacity },
        ]}
      >
        {isLocked && (
          <View style={styles.lockOverlay}>
            <Lock color={colors.textTertiary} size={24} strokeWidth={2} />
          </View>
        )}

        {isCompleted && (
          <View style={styles.crownBadge}>
            <Crown color={colors.warning} size={16} strokeWidth={2} fill={colors.warning} />
          </View>
        )}

        <View style={[styles.modeBadge, { backgroundColor: getModeColor() }]}>
          <Text style={styles.modeBadgeText}>
            {book.mode === 0 ? '読' : book.mode === 1 ? '解' : '暗'}
          </Text>
        </View>

        <Text style={styles.nodeTitle} numberOfLines={2}>
          {book.title}
        </Text>

        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${book.totalUnit > 0 ? ((book.completedUnit || 0) / book.totalUnit) * 100 : 0}%`,
                backgroundColor: getModeColor(),
              },
            ]}
          />
        </View>

        <Text style={styles.progressText}>
          {book.completedUnit} / {book.totalUnit}
        </Text>
      </View>
    </PressableScale>
  </Animated.View>
  );
}

const styles = StyleSheet.create({
  nodeContainer: {
    width: 140,
    height: 140,
  },
  node: {
    width: '100%',
    height: '100%',
    padding: 12,
    borderWidth: 2,
    borderRadius: 16,
    justifyContent: 'space-between',
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  crownBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  modeBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  modeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  nodeTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.surface,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 10,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  hubContainer: {
    width: 140,
    height: 100,
  },
  hubNode: {
    width: '100%',
    height: '100%',
    padding: 16,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 16,
    borderStyle: 'dashed',
  },
  hubContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hubText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  hubSubtext: {
    fontSize: 10,
    color: colors.textSecondary,
  },
});
