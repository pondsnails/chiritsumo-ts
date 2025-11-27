/**
 * responsive.ts
 * レスポンシブデザインとアクセシビリティのヘルパー
 */

import { Dimensions, Platform, PixelRatio } from 'react-native';

/**
 * デバイス情報
 */
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * デバイスタイプ判定
 */
export const isSmallDevice = SCREEN_WIDTH < 375;
export const isMediumDevice = SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 768;
export const isLargeDevice = SCREEN_WIDTH >= 768;
export const isTablet = SCREEN_WIDTH >= 768;

/**
 * プラットフォーム判定
 */
export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';
export const isWeb = Platform.OS === 'web';

/**
 * スケーリング関数（デザインベース: iPhone 12 Pro = 390px）
 */
const DESIGN_WIDTH = 390;
const DESIGN_HEIGHT = 844;

export function scaleWidth(size: number): number {
  return (SCREEN_WIDTH / DESIGN_WIDTH) * size;
}

export function scaleHeight(size: number): number {
  return (SCREEN_HEIGHT / DESIGN_HEIGHT) * size;
}

/**
 * フォントサイズのスケーリング（最小・最大制限付き）
 */
export function scaleFontSize(size: number, minSize?: number, maxSize?: number): number {
  const scale = SCREEN_WIDTH / DESIGN_WIDTH;
  const scaledSize = size * scale;
  
  if (minSize && scaledSize < minSize) return minSize;
  if (maxSize && scaledSize > maxSize) return maxSize;
  
  return Math.round(PixelRatio.roundToNearestPixel(scaledSize));
}

/**
 * レスポンシブ値（デバイスサイズに応じて異なる値を返す）
 */
export function responsiveValue<T>(
  small: T,
  medium: T,
  large: T
): T {
  if (isSmallDevice) return small;
  if (isMediumDevice) return medium;
  return large;
}

/**
 * タッチターゲットサイズの最小値（アクセシビリティ）
 * Apple HIG: 44pt, Material Design: 48dp
 */
export const MIN_TOUCH_TARGET = Platform.select({
  ios: 44,
  android: 48,
  default: 44,
});

/**
 * タッチ可能領域を確保するためのパディング計算
 */
export function getTouchablePadding(contentSize: number): number {
  if (contentSize >= MIN_TOUCH_TARGET) return 0;
  return (MIN_TOUCH_TARGET - contentSize) / 2;
}

/**
 * セーフエリアインセット（プラットフォーム別）
 */
export const SAFE_AREA_INSETS = {
  top: Platform.select({ ios: 44, android: 0, default: 0 }),
  bottom: Platform.select({ ios: 34, android: 0, default: 0 }),
  left: 0,
  right: 0,
};

/**
 * スペーシングシステム（8ptグリッド）
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/**
 * レスポンシブスペーシング
 */
export function responsiveSpacing(base: keyof typeof spacing): number {
  const value = spacing[base];
  return responsiveValue(
    value * 0.8,  // 小さいデバイス
    value,        // 中サイズデバイス
    value * 1.2   // 大きいデバイス
  );
}

/**
 * ボーダーラディウス（統一）
 */
export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

/**
 * シャドウスタイル（プラットフォーム別）
 */
export function getShadowStyle(elevation: 1 | 2 | 3 | 4 | 5 = 2) {
  if (Platform.OS === 'android') {
    return {
      elevation,
    };
  }
  
  // iOS
  const shadowConfig = {
    1: { shadowOpacity: 0.1, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } },
    2: { shadowOpacity: 0.15, shadowRadius: 3, shadowOffset: { width: 0, height: 2 } },
    3: { shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 3 } },
    4: { shadowOpacity: 0.25, shadowRadius: 5, shadowOffset: { width: 0, height: 4 } },
    5: { shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 5 } },
  };
  
  return {
    shadowColor: '#000',
    ...shadowConfig[elevation],
  };
}

/**
 * アクセシビリティプロップ生成
 */
export function getAccessibilityProps(
  label: string,
  hint?: string,
  role?: 'button' | 'link' | 'header' | 'image' | 'text'
) {
  return {
    accessibilityLabel: label,
    accessibilityHint: hint,
    accessibilityRole: role,
    accessible: true,
  };
}

/**
 * タブレット専用スタイル
 */
export function tabletOnly<T>(style: T): T | {} {
  return isTablet ? style : {};
}

/**
 * モバイル専用スタイル
 */
export function mobileOnly<T>(style: T): T | {} {
  return !isTablet ? style : {};
}

/**
 * プラットフォーム別スタイル（型安全）
 */
export function platformSelect<T>(
  config: {
    ios?: T;
    android?: T;
    web?: T;
    default?: T;
  }
): T | undefined {
  if (isIOS && config.ios !== undefined) return config.ios;
  if (isAndroid && config.android !== undefined) return config.android;
  if (isWeb && config.web !== undefined) return config.web;
  return config.default;
}

/**
 * デバイス向きの検出
 */
export function isPortrait(): boolean {
  return SCREEN_HEIGHT > SCREEN_WIDTH;
}

export function isLandscape(): boolean {
  return SCREEN_WIDTH > SCREEN_HEIGHT;
}

/**
 * ダークモード判定（将来的な実装）
 */
export function isDarkMode(): boolean {
  // TODO: useColorSchemeで実装
  return false;
}
