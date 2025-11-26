/**
 * 完了予測バッジコンポーネント（Pro版限定）
 * 書籍の完了予測日を表示
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Calendar } from 'lucide-react-native';
import { Book } from '../types';
import { getCompletionPrediction, CompletionPrediction } from '../services/completionPredictor';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { colors } from '../theme/colors';

interface CompletionBadgeProps {
  book: Book;
}

export const CompletionBadge: React.FC<CompletionBadgeProps> = ({ book }) => {
  const { isProUser } = useSubscriptionStore();
  const [prediction, setPrediction] = useState<CompletionPrediction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isProUser) {
      setLoading(false);
      return;
    }

    const fetchPrediction = async () => {
      try {
        const result = await getCompletionPrediction(book);
        setPrediction(result);
      } catch (error) {
        console.error('Failed to get completion prediction:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrediction();
  }, [book, isProUser]);

  if (!isProUser) {
    return null;
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (!prediction || !prediction.date) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Calendar color={colors.primary} size={14} strokeWidth={2} />
        <Text style={styles.text}>{prediction.formattedString}</Text>
      </View>
      {prediction.dailyPaceNeeded && prediction.dailyPaceNeeded > 0 && (
        <Text style={styles.subtext}>
          1日{prediction.dailyPaceNeeded}ページで達成
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  subtext: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
    marginLeft: 4,
  },
});
