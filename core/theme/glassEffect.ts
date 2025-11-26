import { StyleSheet, Platform } from 'react-native';
import { colors } from './colors';

/**
 * Glassmorphism effect styles
 * Android端末ではBlur効果の代わりに不透明度の高い背景を使用してパフォーマンス改善
 */
export const glassEffect = StyleSheet.create({
  container: {
    backgroundColor: Platform.OS === 'android' 
      ? 'rgba(26, 26, 46, 0.95)' // Android: 不透明度高めでパフォーマンス向上
      : colors.surface,
    borderColor: colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  containerLarge: {
    backgroundColor: Platform.OS === 'android'
      ? 'rgba(26, 26, 46, 0.95)'
      : colors.surface,
    borderColor: colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  card: {
    backgroundColor: Platform.OS === 'android'
      ? 'rgba(26, 26, 46, 0.95)'
      : colors.surface,
    borderColor: colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
