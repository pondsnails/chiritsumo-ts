/**
 * 厳選ルートマップ画面
 * 開発者が選定した学習ルートとアフィリエイトリンクを表示
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Image,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, ExternalLink, Clock, BarChart3 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/app/core/theme/colors';
import { glassEffect } from '@/app/core/theme/glassEffect';
import recommendedRoutes from '@/app/core/data/recommendedRoutes.json';

type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

interface Book {
  title: string;
  author: string;
  coverUrl: string;
  affiliateUrl: string;
  pages: number;
  description: string;
}

interface Route {
  id: string;
  title: string;
  description: string;
  difficulty: DifficultyLevel;
  estimatedMonths: number;
  books: Book[];
}

const DIFFICULTY_LABELS: Record<DifficultyLevel, { label: string; color: string }> = {
  beginner: { label: '初級', color: colors.success },
  intermediate: { label: '中級', color: colors.warning },
  advanced: { label: '上級', color: colors.error },
};

export default function RecommendedRoutesScreen() {
  const router = useRouter();
  const routes = recommendedRoutes as Route[];

  const handleOpenAffiliateLink = async (url: string, bookTitle: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error(`Failed to open affiliate link for ${bookTitle}:`, error);
    }
  };

  return (
    <LinearGradient colors={[colors.background, colors.backgroundDark]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft color={colors.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>厳選ルートマップ</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.description}>
            目標達成への最短ルートを厳選しました。タップでAmazonへ移動します。
          </Text>

          {routes.map((route) => (
            <View key={route.id} style={[glassEffect.card, styles.routeCard]}>
              {/* ルートヘッダー */}
              <View style={styles.routeHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.routeTitle}>{route.title}</Text>
                  <Text style={styles.routeDescription}>{route.description}</Text>
                </View>
                <View
                  style={[
                    styles.difficultyBadge,
                    { backgroundColor: DIFFICULTY_LABELS[route.difficulty].color + '20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.difficultyText,
                      { color: DIFFICULTY_LABELS[route.difficulty].color },
                    ]}
                  >
                    {DIFFICULTY_LABELS[route.difficulty].label}
                  </Text>
                </View>
              </View>

              {/* ルート情報 */}
              <View style={styles.routeInfo}>
                <View style={styles.infoItem}>
                  <Clock color={colors.textSecondary} size={16} strokeWidth={2} />
                  <Text style={styles.infoText}>約{route.estimatedMonths}ヶ月</Text>
                </View>
                <View style={styles.infoItem}>
                  <BarChart3 color={colors.textSecondary} size={16} strokeWidth={2} />
                  <Text style={styles.infoText}>{route.books.length}冊</Text>
                </View>
              </View>

              {/* 書籍リスト */}
              {route.books.map((book, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.bookCard}
                  onPress={() => handleOpenAffiliateLink(book.affiliateUrl, book.title)}
                  activeOpacity={0.7}
                >
                  <Image source={{ uri: book.coverUrl }} style={styles.bookCover} />
                  <View style={styles.bookInfo}>
                    <Text style={styles.bookTitle} numberOfLines={2}>
                      {book.title}
                    </Text>
                    <Text style={styles.bookAuthor}>{book.author}</Text>
                    <Text style={styles.bookDescription} numberOfLines={2}>
                      {book.description}
                    </Text>
                    <View style={styles.bookMeta}>
                      <Text style={styles.bookPages}>{book.pages}ページ</Text>
                      <View style={styles.externalLinkBadge}>
                        <ExternalLink color={colors.primary} size={12} strokeWidth={2} />
                        <Text style={styles.externalLinkText}>Amazon</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  routeCard: {
    padding: 20,
    marginBottom: 20,
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  routeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  routeDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '700',
  },
  routeInfo: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  bookCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface + '40',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 12,
  },
  bookCover: {
    width: 60,
    height: 80,
    borderRadius: 6,
    backgroundColor: colors.surface,
  },
  bookInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  bookTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  bookDescription: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.textTertiary,
  },
  bookMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  bookPages: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  externalLinkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  externalLinkText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
});
