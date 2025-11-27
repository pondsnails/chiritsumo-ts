import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@core/theme/colors';
import { glassEffect } from '@core/theme/glassEffect';

interface SummaryCardsProps {
  dueCount: number;
  reviewLex: number;
  newCount: number;
  newLex: number;
  targetLex: number;
  combinedLex: number;
}

export function SummaryCards({
  dueCount,
  reviewLex,
  newCount,
  newLex,
  targetLex,
  combinedLex,
}: SummaryCardsProps) {
  return (
    <View style={styles.container}>
      <View style={[glassEffect.card, styles.card]}>
        <Text style={styles.label}>復習</Text>
        <Text style={styles.value}>{dueCount}</Text>
        <Text style={styles.lex}>+{reviewLex} Lex</Text>
      </View>
      <View style={[glassEffect.card, styles.card]}>
        <Text style={styles.label}>新規学習</Text>
        <Text style={styles.value}>{newCount}</Text>
        <Text style={styles.lex}>+{newLex} Lex</Text>
      </View>
      <View style={[glassEffect.card, styles.card]}>
        <Text style={styles.label}>目標</Text>
        <Text style={styles.value}>{targetLex}</Text>
        <Text style={[styles.lex, { color: combinedLex >= targetLex ? colors.success : colors.error }]}>
          {combinedLex >= targetLex ? '達成済み' : `不足 ${targetLex - combinedLex} Lex`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 24,
  },
  card: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  label: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  lex: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 4,
  },
});
