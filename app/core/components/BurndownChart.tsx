import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Svg, Line, Circle, Text as SvgText, Path } from 'react-native-svg';
import { TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react-native';
import { colors } from '@/app/core/theme/colors';
import { glassEffect } from '@/app/core/theme/glassEffect';
import type { Book } from '@/app/core/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface BurndownChartProps {
  book: Book;
  dailyHistory: { date: string; completedPages: number }[];
}

interface ChartPoint {
  date: Date;
  ideal: number;
  actual: number | null;
}

export const BurndownChart: React.FC<BurndownChartProps> = ({ book, dailyHistory }) => {
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [status, setStatus] = useState<'ahead' | 'ontrack' | 'behind'>('ontrack');

  useEffect(() => {
    if (!book.targetCompletionDate) return;

    const data = generateChartData();
    setChartData(data);
    updateStatus(data);
  }, [book, dailyHistory]);

  const generateChartData = (): ChartPoint[] => {
    if (!book.targetCompletionDate) return [];

    const startDate = new Date(book.createdAt);
    const targetDate = new Date(book.targetCompletionDate);
    const today = new Date();
    
    startDate.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const totalPages = book.totalUnit;
    const totalDays = Math.ceil((targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    const points: ChartPoint[] = [];
    
    // 累積完了数を計算
    const cumulativeCompletion = new Map<string, number>();
    let cumulative = 0;
    
    dailyHistory.forEach(day => {
      cumulative += day.completedPages;
      cumulativeCompletion.set(day.date, cumulative);
    });

    // 開始日から目標日まで1日ごとのポイントを生成
    for (let i = 0; i <= totalDays; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + i);
      
      const dateString = currentDate.toISOString().split('T')[0];
      
      // 理想の残りページ数（線形減少）
      const idealRemaining = totalPages - (totalPages * i / totalDays);
      
      // 実際の残りページ数
      let actualRemaining: number | null = null;
      if (currentDate <= today) {
        const completed = cumulativeCompletion.get(dateString) || (i === 0 ? 0 : cumulative);
        actualRemaining = totalPages - completed;
      }

      points.push({
        date: currentDate,
        ideal: Math.max(0, idealRemaining),
        actual: actualRemaining,
      });
    }

    return points;
  };

  const updateStatus = (data: ChartPoint[]) => {
    const todayPoint = data.find(p => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return p.date.getTime() === today.getTime();
    });

    if (!todayPoint || todayPoint.actual === null) {
      setStatus('ontrack');
      return;
    }

    const diff = todayPoint.actual - todayPoint.ideal;
    
    if (diff < -10) {
      setStatus('ahead'); // 理想より10ページ以上進んでいる
    } else if (diff > 10) {
      setStatus('behind'); // 理想より10ページ以上遅れている
    } else {
      setStatus('ontrack');
    }
  };

  if (!book.targetCompletionDate || chartData.length === 0) {
    return null;
  }

  const renderChart = () => {
    const width = SCREEN_WIDTH - 64;
    const height = 220;
    const padding = { top: 30, right: 30, bottom: 40, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const maxPages = Math.max(...chartData.map(p => Math.max(p.ideal, p.actual || 0)));
    const maxDays = chartData.length - 1;

    // 理想線のパス
    const idealPath = chartData.reduce((path, point, index) => {
      const x = padding.left + (index / maxDays) * chartWidth;
      const y = padding.top + chartHeight - (point.ideal / maxPages) * chartHeight;
      return index === 0 ? `M ${x} ${y}` : `${path} L ${x} ${y}`;
    }, '');

    // 実績線のパス（nullを除外）
    const actualPoints = chartData.filter(p => p.actual !== null);
    const actualPath = actualPoints.reduce((path, point, index) => {
      const dataIndex = chartData.indexOf(point);
      const x = padding.left + (dataIndex / maxDays) * chartWidth;
      const y = padding.top + chartHeight - (point.actual! / maxPages) * chartHeight;
      return index === 0 ? `M ${x} ${y}` : `${path} L ${x} ${y}`;
    }, '');

    // Y軸のグリッド（ページ数）
    const yTicks = [0, 25, 50, 75, 100].map(percent => {
      const value = Math.round((maxPages * percent) / 100);
      const y = padding.top + chartHeight - (value / maxPages) * chartHeight;
      return { value, y };
    });

    // X軸のグリッド（日付）
    const xTicks = [0, 0.25, 0.5, 0.75, 1].map(ratio => {
      const index = Math.round(maxDays * ratio);
      const point = chartData[index];
      const x = padding.left + (index / maxDays) * chartWidth;
      return { date: point.date, x };
    });

    return (
      <Svg width={width} height={height}>
        {/* Y軸グリッド */}
        {yTicks.map(tick => (
          <React.Fragment key={tick.value}>
            <Line
              x1={padding.left}
              y1={tick.y}
              x2={width - padding.right}
              y2={tick.y}
              stroke={colors.surfaceDark}
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            <SvgText
              x={padding.left - 8}
              y={tick.y + 4}
              fontSize="10"
              fill={colors.textTertiary}
              textAnchor="end"
            >
              {tick.value}
            </SvgText>
          </React.Fragment>
        ))}

        {/* X軸グリッド */}
        {xTicks.map((tick, i) => (
          <React.Fragment key={i}>
            <Line
              x1={tick.x}
              y1={padding.top}
              x2={tick.x}
              y2={height - padding.bottom}
              stroke={colors.surfaceDark}
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            <SvgText
              x={tick.x}
              y={height - padding.bottom + 16}
              fontSize="9"
              fill={colors.textTertiary}
              textAnchor="middle"
            >
              {`${tick.date.getMonth() + 1}/${tick.date.getDate()}`}
            </SvgText>
          </React.Fragment>
        ))}

        {/* 理想線（破線） */}
        <Path
          d={idealPath}
          stroke={colors.textTertiary}
          strokeWidth={2}
          fill="none"
          strokeDasharray="8 4"
        />

        {/* 実績線（太線） */}
        <Path
          d={actualPath}
          stroke={status === 'ahead' ? colors.success : status === 'behind' ? colors.error : colors.primary}
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
        />

        {/* 今日のポイント */}
        {actualPoints.length > 0 && (
          <Circle
            cx={padding.left + ((actualPoints.length - 1) / maxDays) * chartWidth}
            cy={padding.top + chartHeight - ((actualPoints[actualPoints.length - 1].actual || 0) / maxPages) * chartHeight}
            r={6}
            fill={status === 'ahead' ? colors.success : status === 'behind' ? colors.error : colors.primary}
          />
        )}
      </Svg>
    );
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'ahead':
        return {
          icon: <CheckCircle color={colors.success} size={24} strokeWidth={2.5} />,
          title: '順調です！',
          message: '理想ペースより進んでいます。この調子で続けましょう。',
          color: colors.success,
        };
      case 'behind':
        return {
          icon: <AlertTriangle color={colors.error} size={24} strokeWidth={2.5} />,
          title: '要注意',
          message: '理想ペースより遅れています。1日のノルマを見直しましょう。',
          color: colors.error,
        };
      default:
        return {
          icon: <TrendingDown color={colors.primary} size={24} strokeWidth={2.5} />,
          title: 'ちょうど良いペース',
          message: '理想ライン通りに進んでいます。',
          color: colors.primary,
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TrendingDown color={colors.primary} size={28} strokeWidth={2.5} />
        <Text style={styles.title}>合格予測バーンダウンチャート</Text>
      </View>

      <View style={styles.chartContainer}>
        {renderChart()}
      </View>

      <View style={[styles.statusCard, { borderColor: statusConfig.color + '40' }]}>
        {statusConfig.icon}
        <View style={styles.statusContent}>
          <Text style={[styles.statusTitle, { color: statusConfig.color }]}>
            {statusConfig.title}
          </Text>
          <Text style={styles.statusMessage}>{statusConfig.message}</Text>
        </View>
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { borderStyle: 'dashed', borderColor: colors.textTertiary }]} />
          <Text style={styles.legendText}>理想ペース</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: statusConfig.color }]} />
          <Text style={styles.legendText}>実際の進捗</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  chartContainer: {
    backgroundColor: colors.surface + '80',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    backgroundColor: colors.surface + '60',
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 16,
  },
  statusContent: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  statusMessage: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendLine: {
    width: 24,
    height: 3,
    borderRadius: 2,
    borderWidth: 2,
  },
  legendText: {
    fontSize: 12,
    color: colors.textTertiary,
  },
});
