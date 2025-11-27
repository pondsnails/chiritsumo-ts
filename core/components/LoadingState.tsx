/**
 * LoadingState.tsx
 * 統一されたローディング表示コンポーネント
 */

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';

interface LoadingStateProps {
  message?: string;
  size?: 'small' | 'large';
  fullScreen?: boolean;
}

/**
 * ローディング状態を表示
 */
export const LoadingState: React.FC<LoadingStateProps> = ({
  message = '読み込み中...',
  size = 'large',
  fullScreen = false,
}) => {
  return (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      <ActivityIndicator size={size} color={colors.primary} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
};

/**
 * スケルトンローダー（カード用）
 */
export const SkeletonCard: React.FC = () => {
  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonLine} />
      <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
    </View>
  );
};

/**
 * スケルトンローダー（リスト用）
 */
export const SkeletonList: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <View style={styles.skeletonList}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </View>
  );
};

/**
 * プログレスバー
 */
interface ProgressBarProps {
  progress: number; // 0-1
  color?: string;
  backgroundColor?: string;
  height?: number;
  showPercentage?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  color = colors.primary,
  backgroundColor = colors.surface,
  height = 8,
  showPercentage = false,
}) => {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const percentage = Math.round(clampedProgress * 100);

  return (
    <View style={styles.progressContainer}>
      <View style={[styles.progressBackground, { backgroundColor, height }]}>
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: color,
              width: `${percentage}%`,
              height,
            },
          ]}
        />
      </View>
      {showPercentage && (
        <Text style={styles.progressText}>{percentage}%</Text>
      )}
    </View>
  );
};

/**
 * 円形プログレス
 */
interface CircularProgressProps {
  progress: number; // 0-1
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  showPercentage?: boolean;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  progress,
  size = 60,
  strokeWidth = 6,
  color = colors.primary,
  backgroundColor = colors.surface,
  showPercentage = true,
}) => {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const percentage = Math.round(clampedProgress * 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - clampedProgress * circumference;

  return (
    <View style={[styles.circularContainer, { width: size, height: size }]}>
      <svg width={size} height={size}>
        {/* 背景円 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* プログレス円 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {showPercentage && (
        <View style={styles.circularTextContainer}>
          <Text style={styles.circularPercentage}>{percentage}%</Text>
        </View>
      )}
    </View>
  );
};

/**
 * スピナーボタン（ローディング中のボタン）
 */
interface SpinnerButtonProps {
  loading: boolean;
  text: string;
  loadingText?: string;
  onPress: () => void;
  disabled?: boolean;
  color?: string;
}

export const SpinnerButton: React.FC<SpinnerButtonProps> = ({
  loading,
  text,
  loadingText = '処理中...',
  onPress,
  disabled = false,
  color = colors.primary,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.spinnerButton,
        { backgroundColor: color },
        (disabled || loading) && styles.spinnerButtonDisabled,
      ]}
      onPress={loading || disabled ? undefined : onPress}
      disabled={loading || disabled}
    >
      {loading ? (
        <>
          <ActivityIndicator size="small" color={colors.background} />
          <Text style={styles.spinnerButtonText}>{loadingText}</Text>
        </>
      ) : (
        <Text style={styles.spinnerButtonText}>{text}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  fullScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background,
    zIndex: 1000,
  },
  message: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },
  skeletonCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  skeletonLine: {
    height: 16,
    backgroundColor: colors.surfaceBorder,
    borderRadius: 8,
    marginBottom: 8,
  },
  skeletonLineShort: {
    width: '60%',
  },
  skeletonList: {
    padding: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBackground: {
    flex: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: colors.textSecondary,
    minWidth: 40,
    textAlign: 'right',
  },
  circularContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circularTextContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circularPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  spinnerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  spinnerButtonDisabled: {
    opacity: 0.6,
  },
  spinnerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background,
  },
});
