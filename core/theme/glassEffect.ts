import { StyleSheet, Platform } from 'react-native';
import * as Device from 'expo-device';
import { colors } from './colors';

/**
 * Glassmorphism effect styles
 * Android端末ではBlur効果の代わりに不透明度の高い背景を使用してパフォーマンス改善
 * 
 * v7.2.1新機能: ローエンド端末自動検出
 * - Android 8以下
 * - RAM 2GB未満（expo-device経由で検出）
 * 上記端末ではBlurView完全無効化、ソリッドカラーに自動切替
 */

// ローエンド端末判定（起動時に一度だけ実行）
let isLowEndDevice: boolean | null = null;

function checkIsLowEndDevice(): boolean {
  if (isLowEndDevice !== null) return isLowEndDevice;

  // Android 8以下（API Level 26以下）
  if (Platform.OS === 'android' && Platform.Version < 26) {
    isLowEndDevice = true;
    return true;
  }

  // RAM 2GB未満（expo-deviceで取得）
  // ⚠️ expo-deviceはtotalMemoryをサポートしていないため、
  // デバイス名やモデルから推測（または将来的にカスタムネイティブモジュール）
  // 現時点ではAndroid全般でソリッドカラー採用（安全策）
  if (Platform.OS === 'android') {
    isLowEndDevice = true; // Androidは全てソリッドカラー（保守的）
    return true;
  }

  isLowEndDevice = false;
  return false;
}

const useSolidBackground = checkIsLowEndDevice();

export const glassEffect = StyleSheet.create({
  container: {
    backgroundColor: useSolidBackground
      ? 'rgba(26, 26, 46, 1.0)' // ローエンド: 完全不透明
      : Platform.OS === 'android'
      ? 'rgba(26, 26, 46, 0.95)'
      : colors.surface,
    borderColor: colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  containerLarge: {
    backgroundColor: useSolidBackground
      ? 'rgba(26, 26, 46, 1.0)'
      : Platform.OS === 'android'
      ? 'rgba(26, 26, 46, 0.95)'
      : colors.surface,
    borderColor: colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  card: {
    backgroundColor: useSolidBackground
      ? 'rgba(26, 26, 46, 1.0)'
      : Platform.OS === 'android'
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

/**
 * BlurView使用判定
 * ローエンド端末ではBlurView自体を使わず、View + glassEffectのみ使用
 */
export function shouldUseBlurView(): boolean {
  return !useSolidBackground && Platform.OS === 'ios';
}
