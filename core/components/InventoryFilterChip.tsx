import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Home, Coffee, Library, Plus } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { glassEffect } from '../theme/glassEffect';
import type { InventoryPreset } from '../types';

interface Props {
  preset: InventoryPreset;
  isActive: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

const ICON_MAP: Record<number, any> = {
  0: Home,
  1: Coffee,
  2: Library,
  3: Plus,
};

export function InventoryFilterChip({ preset, isActive, onPress, onLongPress }: Props) {
  const Icon = ICON_MAP[preset.iconCode] || Home;

  return (
    <TouchableOpacity
      style={[styles.chip, isActive && styles.chipActive]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <Icon size={16} color={isActive ? colors.primary : colors.textSecondary} />
      <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{preset.label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    ...glassEffect,
  },
  chipActive: {
    backgroundColor: `${colors.primary}20`,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.primary,
  },
});
