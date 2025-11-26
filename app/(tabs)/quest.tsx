import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/app/core/theme/colors';
import { glassEffect } from '@/app/core/theme/glassEffect';

export default function QuestScreen() {
  return (
    <LinearGradient colors={[colors.background, colors.backgroundDark]} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.title}>Quest</Text>
          <View style={styles.summaryContainer}>
            <View style={[glassEffect.card, styles.summaryCard]}>
              <Text style={styles.summaryLabel}>待機中のカード</Text>
              <Text style={styles.summaryValue}>0</Text>
            </View>
            <View style={[glassEffect.card, styles.summaryCard]}>
              <Text style={styles.summaryLabel}>獲得予定Lex</Text>
              <Text style={styles.summaryValue}>0</Text>
            </View>
          </View>
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>学習待機中のカードはありません</Text>
            <Text style={styles.emptySubtext}>Books画面から教材を追加してください</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 120 },
  title: { fontSize: 32, fontWeight: '700', color: colors.text, marginTop: 16, marginHorizontal: 16, marginBottom: 16 },
  summaryContainer: { flexDirection: 'row', gap: 12, marginHorizontal: 16, marginBottom: 24 },
  summaryCard: { flex: 1, padding: 16, alignItems: 'center' },
  summaryLabel: { fontSize: 11, color: colors.textSecondary, marginBottom: 8 },
  summaryValue: { fontSize: 24, fontWeight: '700', color: colors.text },
  emptyState: { justifyContent: 'center', alignItems: 'center', paddingVertical: 64, paddingHorizontal: 32 },
  emptyText: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 8, textAlign: 'center' },
  emptySubtext: { fontSize: 14, color: colors.textTertiary, textAlign: 'center' },
});
