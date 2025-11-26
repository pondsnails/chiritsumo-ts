import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Sparkles, ExternalLink, RefreshCw, Star } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { glassEffect } from '../theme/glassEffect';
import {
  generateBookRecommendations,
  getUserGeminiApiKey,
  type BookRecommendation,
  type AffiliateContext,
} from '../services/aiAffiliate';

interface BookRecommendationsProps {
  context: AffiliateContext;
}

export function BookRecommendations({
  context,
}: BookRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<BookRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAiMode, setIsAiMode] = useState(false);

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    try {
      setIsLoading(true);
      
      // APIキー設定状況を確認
      const apiKey = await getUserGeminiApiKey();
      setIsAiMode(!!apiKey);
      
      const results = await generateBookRecommendations(context);
      setRecommendations(results);
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenLink = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error('Failed to open link:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          {isAiMode ? (
            <>
              <Sparkles color={colors.primary} size={20} />
              <Text style={styles.title}>AI推薦（For You）</Text>
            </>
          ) : (
            <>
              <Star color={colors.warning} size={20} />
              <Text style={styles.title}>おすすめ（Pickup）</Text>
            </>
          )}
        </View>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={loadRecommendations}
          disabled={isLoading || !isAiMode}
        >
          <RefreshCw
            color={isAiMode ? colors.text : colors.textTertiary}
            size={20}
            style={isLoading ? styles.spinning : undefined}
          />
        </TouchableOpacity>
      </View>

      {!isAiMode && (
        <Text style={styles.modeHint}>
          Settings > AI機能設定でAPIキーを設定すると、AIによる個別最適化された推薦が利用できます
        </Text>
      )}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.loadingText}>AIが分析中...</Text>
        </View>
      ) : (
        <FlatList
          data={recommendations}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item, index) => `${item.title}-${index}`}
          renderItem={({ item }) => (
            <View style={[glassEffect.card, styles.recommendationCard]}>
              <View style={styles.cardContent}>
                <Text style={styles.bookTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.bookAuthor} numberOfLines={1}>
                  {item.author}
                </Text>
                <Text style={styles.bookDescription} numberOfLines={3}>
                  {item.description}
                </Text>
                <View style={styles.reasonContainer}>
                  <Text style={styles.reasonLabel}>推薦理由</Text>
                  <Text style={styles.reasonText} numberOfLines={2}>
                    {item.reason}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => handleOpenLink(item.affiliateLink)}
              >
                <ExternalLink color={colors.primary} size={16} />
                <Text style={styles.linkButtonText}>Amazonで見る</Text>
              </TouchableOpacity>
            </View>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  modeHint: {
    fontSize: 12,
    color: colors.textTertiary,
    marginBottom: 12,
    paddingHorizontal: 4,
    lineHeight: 16,
  },
  refreshButton: {
    padding: 8,
  },
  spinning: {
    transform: [{ rotate: '360deg' }],
  },
  loadingContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  listContent: {
    paddingHorizontal: 4,
  },
  recommendationCard: {
    width: 280,
    padding: 16,
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
    marginBottom: 12,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  bookDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  reasonContainer: {
    padding: 12,
    backgroundColor: colors.primary + '10',
    borderRadius: 8,
  },
  reasonLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 12,
    color: colors.text,
    lineHeight: 16,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: colors.primary + '20',
    borderRadius: 8,
  },
  linkButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
});
