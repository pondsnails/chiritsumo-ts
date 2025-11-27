import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '@core/theme/colors';

interface Props {
  value: number; // 0-1
  height?: number;
  color?: string;
  backgroundColor?: string;
  rounded?: boolean;
}

export const ProgressBar: React.FC<Props> = ({ value, height = 10, color = colors.primary, backgroundColor = 'rgba(255,255,255,0.12)', rounded = true }) => {
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <View style={[styles.outer, { height, backgroundColor, borderRadius: rounded ? height / 2 : 4 }]}>
      <View style={[styles.inner, { width: `${clamped * 100}%`, backgroundColor: color, borderRadius: rounded ? height / 2 : 4 }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  outer: {
    width: '100%',
    overflow: 'hidden',
  },
  inner: {
    height: '100%',
  },
});

export default ProgressBar;