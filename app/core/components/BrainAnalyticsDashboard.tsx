import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { Svg, Rect, Line, Text as SvgText, Circle, Path } from 'react-native-svg';
import { Brain, TrendingUp, Clock, Target } from 'lucide-react-native';
import { colors } from '@/app/core/theme/colors';
import { glassEffect } from '@/app/core/theme/glassEffect';
import { cardsDB } from '@/app/core/database/db';
import type { Card } from '@/app/core/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DailyActivity {
  date: string;
  count: number;
}

interface RetentionData {
  daysElapsed: number;
  retention: number;
}

export const BrainAnalyticsDashboard: React.FC = () => {
  const [totalCards, setTotalCards] = useState(0);
  const [avgRetention, setAvgRetention] = useState(0);
  const [heatmapData, setHeatmapData] = useState<DailyActivity[]>([]);
  const [forgettingCurve, setForgettingCurve] = useState<RetentionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      
      // 全カードデータ取得
      const allCards = await cardsDB.getAll();
      setTotalCards(allCards.length);

      // ヒートマップデータ生成（過去90日間）
      const heatmap = generateHeatmapData(allCards);
      setHeatmapData(heatmap);

      // 忘却曲線データ生成
      const curve = generateForgettingCurve(allCards);
      setForgettingCurve(curve);

      // 平均保持率計算
      const retention = calculateAverageRetention(allCards);
      setAvgRetention(retention);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateHeatmapData = (cards: Card[]): DailyActivity[] => {
    const now = new Date();
    const data: DailyActivity[] = [];
    
    for (let i = 89; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      
      const count = cards.filter(card => {
        if (!card.lastReview) return false;
        const reviewDate = new Date(card.lastReview).toISOString().split('T')[0];
        return reviewDate === dateString;
      }).length;
      
      data.push({ date: dateString, count });
    }
    
    return data;
  };

  const generateForgettingCurve = (cards: Card[]): RetentionData[] => {
    // 復習済みカードのみ抽出
    const reviewedCards = cards.filter(c => c.lastReview && c.reps > 0);
    
    if (reviewedCards.length === 0) {
      return Array.from({ length: 31 }, (_, i) => ({
        daysElapsed: i,
        retention: 100 - (i * 2.5), // デフォルト曲線
      }));
    }

    // 日数ごとの保持率計算
    const retentionByDay: { [key: number]: number[] } = {};
    
    reviewedCards.forEach(card => {
      if (!card.lastReview) return;
      
      const daysSinceReview = Math.floor(
        (Date.now() - new Date(card.lastReview).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceReview > 30) return;
      
      // FSRS安定性から保持率推定
      const estimatedRetention = Math.min(100, (card.stability / (daysSinceReview + 1)) * 100);
      
      if (!retentionByDay[daysSinceReview]) {
        retentionByDay[daysSinceReview] = [];
      }
      retentionByDay[daysSinceReview].push(estimatedRetention);
    });

    // 平均化
    return Array.from({ length: 31 }, (_, i) => {
      const values = retentionByDay[i] || [];
      const avgRetention = values.length > 0
        ? values.reduce((sum, v) => sum + v, 0) / values.length
        : Math.max(0, 100 - (i * 3));
      
      return { daysElapsed: i, retention: avgRetention };
    });
  };

  const calculateAverageRetention = (cards: Card[]): number => {
    const reviewedCards = cards.filter(c => c.lastReview && c.reps > 0);
    
    if (reviewedCards.length === 0) return 0;
    
    const totalRetention = reviewedCards.reduce((sum, card) => {
      const daysSinceReview = Math.floor(
        (Date.now() - new Date(card.lastReview!).getTime()) / (1000 * 60 * 60 * 24)
      );
      const retention = Math.min(100, (card.stability / (daysSinceReview + 1)) * 100);
      return sum + retention;
    }, 0);
    
    return totalRetention / reviewedCards.length;
  };

  const renderHeatmap = () => {
    const cellSize = 10;
    const gap = 2;
    const cols = 13; // 週数
    const rows = 7; // 曜日
    
    const maxCount = Math.max(...heatmapData.map(d => d.count), 1);
    
    const getColor = (count: number) => {
      if (count === 0) return colors.surfaceDark;
      const intensity = Math.min(1, count / maxCount);
      
      if (intensity < 0.25) return colors.primary + '40';
      if (intensity < 0.5) return colors.primary + '60';
      if (intensity < 0.75) return colors.primary + '80';
      return colors.primary;
    };

    return (
      <View style={styles.heatmapContainer}>
        <View style={styles.sectionHeader}>
          <TrendingUp color={colors.primary} size={20} strokeWidth={2} />
          <Text style={styles.sectionTitle}>学習ヒートマップ（過去90日）</Text>
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Svg width={cols * (cellSize + gap)} height={rows * (cellSize + gap) + 20}>
            {heatmapData.slice(-91).map((day, index) => {
              const col = Math.floor(index / rows);
              const row = index % rows;
              
              return (
                <Rect
                  key={index}
                  x={col * (cellSize + gap)}
                  y={row * (cellSize + gap) + 20}
                  width={cellSize}
                  height={cellSize}
                  fill={getColor(day.count)}
                  rx={2}
                />
              );
            })}
            
            {/* 曜日ラベル */}
            {['日', '月', '火', '水', '木', '金', '土'].map((label, i) => (
              <SvgText
                key={label}
                x={-2}
                y={i * (cellSize + gap) + cellSize / 2 + 24}
                fontSize="8"
                fill={colors.textTertiary}
                textAnchor="end"
              >
                {label}
              </SvgText>
            ))}
          </Svg>
        </ScrollView>
        
        <View style={styles.heatmapLegend}>
          <Text style={styles.legendText}>少</Text>
          {[0, 1, 2, 3, 4].map(i => (
            <View
              key={i}
              style={[
                styles.legendCell,
                { backgroundColor: i === 0 ? colors.surfaceDark : `${colors.primary}${['40', '60', '80', 'FF'][i - 1]}` }
              ]}
            />
          ))}
          <Text style={styles.legendText}>多</Text>
        </View>
      </View>
    );
  };

  const renderForgettingCurve = () => {
    const width = SCREEN_WIDTH - 64;
    const height = 180;
    const padding = { top: 20, right: 20, bottom: 30, left: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const maxDays = 30;
    const maxRetention = 100;

    const points = forgettingCurve.map((point, index) => {
      const x = padding.left + (point.daysElapsed / maxDays) * chartWidth;
      const y = padding.top + chartHeight - (point.retention / maxRetention) * chartHeight;
      return { x, y, retention: point.retention };
    });

    const pathData = points.reduce((path, point, index) => {
      if (index === 0) return `M ${point.x} ${point.y}`;
      return `${path} L ${point.x} ${point.y}`;
    }, '');

    return (
      <View style={styles.curveContainer}>
        <View style={styles.sectionHeader}>
          <Brain color={colors.success} size={20} strokeWidth={2} />
          <Text style={styles.sectionTitle}>忘却曲線（記憶保持率）</Text>
        </View>
        
        <Svg width={width} height={height}>
          {/* グリッド線（Y軸） */}
          {[0, 25, 50, 75, 100].map(value => {
            const y = padding.top + chartHeight - (value / maxRetention) * chartHeight;
            return (
              <React.Fragment key={value}>
                <Line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke={colors.surfaceDark}
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
                <SvgText
                  x={padding.left - 8}
                  y={y + 4}
                  fontSize="10"
                  fill={colors.textTertiary}
                  textAnchor="end"
                >
                  {value}%
                </SvgText>
              </React.Fragment>
            );
          })}

          {/* グリッド線（X軸） */}
          {[0, 7, 14, 21, 30].map(day => {
            const x = padding.left + (day / maxDays) * chartWidth;
            return (
              <React.Fragment key={day}>
                <Line
                  x1={x}
                  y1={padding.top}
                  x2={x}
                  y2={height - padding.bottom}
                  stroke={colors.surfaceDark}
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
                <SvgText
                  x={x}
                  y={height - padding.bottom + 16}
                  fontSize="10"
                  fill={colors.textTertiary}
                  textAnchor="middle"
                >
                  {day}日
                </SvgText>
              </React.Fragment>
            );
          })}

          {/* 曲線 */}
          <Path
            d={pathData}
            stroke={colors.success}
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
          />

          {/* データポイント */}
          {points.filter((_, i) => i % 3 === 0).map((point, index) => (
            <Circle
              key={index}
              cx={point.x}
              cy={point.y}
              r={4}
              fill={colors.success}
            />
          ))}
        </Svg>

        <Text style={styles.curveDescription}>
          📊 {forgettingCurve[7]?.retention.toFixed(0)}%の情報が1週間後も記憶されています
        </Text>
      </View>
    );
  };

  const renderStats = () => (
    <View style={styles.statsGrid}>
      <View style={[glassEffect.card, styles.statCard]}>
        <Target color={colors.primary} size={24} strokeWidth={2} />
        <Text style={styles.statValue}>{totalCards}</Text>
        <Text style={styles.statLabel}>総カード数</Text>
      </View>

      <View style={[glassEffect.card, styles.statCard]}>
        <Clock color={colors.warning} size={24} strokeWidth={2} />
        <Text style={styles.statValue}>{avgRetention.toFixed(0)}%</Text>
        <Text style={styles.statLabel}>平均保持率</Text>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>分析中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.dashboardHeader}>
        <Brain color={colors.primary} size={28} strokeWidth={2.5} />
        <Text style={styles.dashboardTitle}>脳内分析ダッシュボード</Text>
      </View>
      
      {renderStats()}
      {renderHeatmap()}
      {renderForgettingCurve()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  dashboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  dashboardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    borderRadius: 16,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginTop: 12,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  heatmapContainer: {
    backgroundColor: colors.surface + '80',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  heatmapLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  legendText: {
    fontSize: 10,
    color: colors.textTertiary,
  },
  legendCell: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  curveContainer: {
    backgroundColor: colors.surface + '80',
    borderRadius: 16,
    padding: 20,
  },
  curveDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 12,
    textAlign: 'center',
  },
});
