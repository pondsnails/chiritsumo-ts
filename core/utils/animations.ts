/**
 * animations.ts
 * 統一されたアニメーション定義
 * 
 * React Native Reanimatedを使用した滑らかなアニメーション
 */

import { 
  withTiming, 
  withSpring, 
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';

/**
 * アニメーション設定プリセット
 */
export const AnimationPresets = {
  // 標準的なタイミングアニメーション
  smooth: {
    duration: 300,
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
  },
  
  // 高速アニメーション
  fast: {
    duration: 150,
    easing: Easing.out(Easing.cubic),
  },
  
  // ゆっくりしたアニメーション
  slow: {
    duration: 500,
    easing: Easing.inOut(Easing.quad),
  },
  
  // スプリングアニメーション
  spring: {
    damping: 15,
    stiffness: 150,
    mass: 1,
  },
  
  // バウンス効果
  bounce: {
    damping: 10,
    stiffness: 100,
    mass: 1.5,
  },
} as const;

/**
 * フェードイン
 */
export function fadeIn(duration: number = 300) {
  return withTiming(1, { duration, easing: Easing.out(Easing.ease) });
}

/**
 * フェードアウト
 */
export function fadeOut(duration: number = 300) {
  return withTiming(0, { duration, easing: Easing.in(Easing.ease) });
}

/**
 * スライドイン（下から）
 */
export function slideInFromBottom(
  targetValue: number = 0,
  config = AnimationPresets.smooth
) {
  return withSpring(targetValue, config);
}

/**
 * スライドアウト（下へ）
 */
export function slideOutToBottom(
  targetValue: number = 100,
  config = AnimationPresets.smooth
) {
  return withTiming(targetValue, config);
}

/**
 * スケールアニメーション（拡大）
 */
export function scaleIn(config = AnimationPresets.spring) {
  return withSpring(1, config);
}

/**
 * スケールアニメーション（縮小）
 */
export function scaleOut(config = AnimationPresets.fast) {
  return withTiming(0, config);
}

/**
 * パルスエフェクト（注目させる）
 */
export function pulse(scale: number = 1.1, duration: number = 500) {
  return withSequence(
    withTiming(scale, { duration: duration / 2 }),
    withTiming(1, { duration: duration / 2 })
  );
}

/**
 * シェイクエフェクト（エラー表示）
 */
export function shake(intensity: number = 10, duration: number = 400) {
  return withSequence(
    withTiming(intensity, { duration: duration / 6 }),
    withTiming(-intensity, { duration: duration / 6 }),
    withTiming(intensity, { duration: duration / 6 }),
    withTiming(-intensity, { duration: duration / 6 }),
    withTiming(intensity / 2, { duration: duration / 6 }),
    withTiming(0, { duration: duration / 6 })
  );
}

/**
 * ローテーションアニメーション（360度回転）
 */
export function rotate360(duration: number = 1000) {
  return withTiming(360, { duration, easing: Easing.linear });
}

/**
 * 遅延付きアニメーション
 */
export function withDelayedAnimation<T>(
  animation: T,
  delay: number = 100
): T {
  return withDelay(delay, animation as any) as T;
}

/**
 * スタガードアニメーション用のディレイ計算
 */
export function getStaggerDelay(index: number, baseDelay: number = 50): number {
  return index * baseDelay;
}

/**
 * カードフリップアニメーション
 */
export function flipCard(duration: number = 600) {
  return withSequence(
    withTiming(90, { duration: duration / 2, easing: Easing.in(Easing.ease) }),
    withTiming(0, { duration: duration / 2, easing: Easing.out(Easing.ease) })
  );
}

/**
 * エラスティック効果（ゴム的な動き）
 */
export function elastic(targetValue: number = 0) {
  return withSpring(targetValue, {
    damping: 8,
    stiffness: 80,
    mass: 1.2,
  });
}

/**
 * バウンス入場
 */
export function bounceIn(config = AnimationPresets.bounce) {
  return withSpring(1, config);
}

/**
 * バウンス退場
 */
export function bounceOut(targetValue: number = 0, config = AnimationPresets.bounce) {
  return withSpring(targetValue, config);
}
