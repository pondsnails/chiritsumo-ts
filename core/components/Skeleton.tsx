/**
 * Skeleton Loading Components
 * カクつきを防ぐプレースホルダーUI
 */
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors } from '@core/theme/colors';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export function Skeleton({ width = '100%', height = 20, borderRadius = 8, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width, height, borderRadius, opacity },
        style,
      ]}
    />
  );
}

export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <Skeleton width="60%" height={24} style={{ marginBottom: 12 }} />
      <Skeleton width="100%" height={16} style={{ marginBottom: 8 }} />
      <Skeleton width="80%" height={16} style={{ marginBottom: 16 }} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Skeleton width={80} height={32} borderRadius={16} />
        <Skeleton width={100} height={32} borderRadius={16} />
      </View>
    </View>
  );
}

export function SkeletonBookList() {
  return (
    <View style={{ gap: 12 }}>
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </View>
  );
}

export function SkeletonQuestHeader() {
  return (
    <View style={styles.questHeader}>
      <Skeleton width="40%" height={28} style={{ marginBottom: 16 }} />
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
        <View style={{ flex: 1 }}>
          <Skeleton width="100%" height={80} borderRadius={12} />
        </View>
        <View style={{ flex: 1 }}>
          <Skeleton width="100%" height={80} borderRadius={12} />
        </View>
      </View>
      <Skeleton width="100%" height={120} borderRadius={12} />
    </View>
  );
}

export function SkeletonCardItem() {
  return (
    <View style={styles.cardItem}>
      <View style={{ flex: 1 }}>
        <Skeleton width="70%" height={18} style={{ marginBottom: 8 }} />
        <Skeleton width="50%" height={14} />
      </View>
      <Skeleton width={60} height={24} borderRadius={12} />
    </View>
  );
}

export function SkeletonCardList() {
  return (
    <View style={{ gap: 8 }}>
      {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
        <SkeletonCardItem key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: colors.textSecondary + '20',
  },
  card: {
    backgroundColor: colors.surface + '40',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder + '40',
  },
  questHeader: {
    padding: 20,
  },
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface + '40',
    borderRadius: 12,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder + '40',
  },
});
