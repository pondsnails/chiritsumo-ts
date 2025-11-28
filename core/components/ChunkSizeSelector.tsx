import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '@core/theme/colors';
import { glassEffect } from '@core/theme/glassEffect';

interface ChunkSizeSelectorProps {
  value: number;
  onChange: (size: number) => void;
  totalUnit?: number;
  disabled?: boolean;
}

// 簡略化された3択プリセット
const PRESETS = [
  { id: 'small', label: 'じっくり（小）', value: 5, description: '細かく復習' },
  { id: 'medium', label: 'ふつう（中）', value: 10, description: 'バランス型' },
  { id: 'large', label: 'ざっくり（大）', value: 20, description: '効率重視' },
] as const;

export default function ChunkSizeSelector({ value, onChange, totalUnit, disabled }: ChunkSizeSelectorProps) {
  const selectedPreset = PRESETS.find(p => p.value === value) || PRESETS[1];
  const totalChunks = totalUnit && value > 0 ? Math.ceil(totalUnit / value) : null;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>カードの粒度</Text>
      <Text style={styles.description}>
        1枚のカードで学習する範囲を選択
      </Text>
      <View style={styles.presetGrid}>
        {PRESETS.map(preset => (
          <TouchableOpacity
            key={preset.id}
            style={[
              styles.presetCard,
              value === preset.value && styles.presetCardActive,
              disabled && styles.disabled
            ]}
            disabled={disabled}
            onPress={() => onChange(preset.value)}
          >
            <Text style={[styles.presetLabel, value === preset.value && styles.presetLabelActive]}>
              {preset.label}
            </Text>
            <Text style={[styles.presetDescription, value === preset.value && styles.presetDescriptionActive]}>
              {preset.description}
            </Text>
            <Text style={[styles.presetValue, value === preset.value && styles.presetValueActive]}>
              {preset.value}ページ/問
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {totalChunks !== null && (
        <Text style={styles.footerHint}>生成カード数: 約{totalChunks}枚</Text>
      )}
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  description: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  presetGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  presetCard: {
    flex: 1,
    ...glassEffect.card,
    padding: 16,
    alignItems: 'center',
    gap: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  presetCardActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}15`,
  },
  presetLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  presetLabelActive: {
    color: colors.primary,
  },
  presetDescription: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  presetDescriptionActive: {
    color: colors.primary,
  },
  presetValue: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 4,
  },
  presetValueActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
  footerHint: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
});

