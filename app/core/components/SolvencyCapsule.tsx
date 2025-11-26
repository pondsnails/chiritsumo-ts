import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { glassEffect } from '../theme/glassEffect';

interface SolvencyCapsuleProps {
  balance: number;
  todayTarget: number;
  todayEarned: number;
}

export function SolvencyCapsule({ balance, todayTarget, todayEarned }: SolvencyCapsuleProps) {
  const solvencyRatio = todayTarget > 0 ? (balance / todayTarget) * 100 : 0;
  const progressPercentage = Math.min(Math.max(solvencyRatio, -100), 100);
  const isPositive = balance >= 0;

  return (
    <View style={[glassEffect.containerLarge, styles.container]}>
      <View style={styles.barContainer}>
        <View style={styles.barTrack}>
          <View style={styles.centerLine} />
          {isPositive ? (
            <View
              style={[
                styles.barFillRight,
                {
                  width: `${Math.abs(progressPercentage) / 2}%`,
                },
              ]}
            >
              <LinearGradient
                colors={[colors.success, colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </View>
          ) : (
            <View
              style={[
                styles.barFillLeft,
                {
                  width: `${Math.abs(progressPercentage) / 2}%`,
                },
              ]}
            >
              <LinearGradient
                colors={[colors.error, colors.warning]}
                start={{ x: 1, y: 0 }}
                end={{ x: 0, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </View>
          )}
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{todayEarned}</Text>
          <Text style={styles.statLabel}>獲得</Text>
        </View>

        <View style={styles.balanceItem}>
          <Text
            style={[
              styles.balanceValue,
              { color: isPositive ? colors.success : colors.error },
            ]}
          >
            {isPositive ? '+' : ''}
            {balance}
          </Text>
          <Text style={styles.balanceLabel}>Lex</Text>
        </View>

        <View style={styles.statItem}>
          <Text style={styles.statValue}>{todayTarget}</Text>
          <Text style={styles.statLabel}>目標</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
  },
  barContainer: {
    marginBottom: 16,
  },
  barTrack: {
    height: 8,
    backgroundColor: colors.surface,
    borderRadius: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  centerLine: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: colors.textTertiary,
    zIndex: 1,
  },
  barFillRight: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    borderRadius: 4,
  },
  barFillLeft: {
    position: 'absolute',
    right: '50%',
    top: 0,
    bottom: 0,
    borderRadius: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  balanceItem: {
    alignItems: 'center',
    flex: 1,
  },
  balanceValue: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
  },
  balanceLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
