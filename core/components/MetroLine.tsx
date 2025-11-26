import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors } from '../theme/colors';
import type { Edge } from '../layout/metroLayout';

interface MetroLineProps {
  edges: Edge[];
  width: number;
  height: number;
}

export function MetroLine({ edges, width, height }: MetroLineProps) {
  const createPath = (edge: Edge): string => {
    const { from, to } = edge;

    if (Math.abs(from.x - to.x) < 10) {
      return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
    }

    const controlY1 = from.y + (to.y - from.y) * 0.4;
    const controlY2 = from.y + (to.y - from.y) * 0.6;

    return `M ${from.x} ${from.y} C ${from.x} ${controlY1}, ${to.x} ${controlY2}, ${to.x} ${to.y}`;
  };

  return (
    <View style={styles.container}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="primaryGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={colors.primary} stopOpacity="0.8" />
            <Stop offset="100%" stopColor={colors.primary} stopOpacity="0.4" />
          </LinearGradient>
          <LinearGradient id="branchGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={colors.textSecondary} stopOpacity="0.4" />
            <Stop offset="100%" stopColor={colors.textSecondary} stopOpacity="0.2" />
          </LinearGradient>
        </Defs>

        {edges.map((edge, index) => (
          <Path
            key={index}
            d={createPath(edge)}
            stroke={edge.isPrimary ? 'url(#primaryGradient)' : 'url(#branchGradient)'}
            strokeWidth={edge.isPrimary ? 4 : 2}
            fill="none"
            strokeLinecap="round"
          />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
