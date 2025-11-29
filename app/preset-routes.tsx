import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Zap, BookOpen, Award, Code, Globe, ChevronRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useServices } from '@core/di/ServicesProvider';
import { PRESET_ROUTES, generateBooksFromPreset } from '@core/presets/presetRouteTemplates';
import type { PresetRoute } from '@core/presets/presetRouteTemplates';
import { colors } from '@core/theme/colors';

const CATEGORY_ICONS = {
  exam: Award,
  programming: Code,
  language: Globe,
  business: BookOpen,
};

const DIFFICULTY_COLORS = {
  beginner: '#00F260',
  intermediate: '#FBBF24',
  advanced: '#FF416C',
};

const DIFFICULTY_LABELS = {
  beginner: '初級',
  intermediate: '中級',
  advanced: '上級',
};

/**
 * preset-routes.tsx
 * 
 * プリセットルート選択画面
 * 初回起動時または設定画面から呼び出し、ワンタップで学習ルート一式を展開
 * 
 * 機能:
 * - カテゴリ別フィルタ
 * - 難易度・推定日数の表示
 * - 展開前のプレビュー
 * - 展開後に/(tabs)/questへ自動遷移
 */
export default function PresetRoutesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { bookRepo, settingsRepo } = useServices();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const filteredRoutes = selectedCategory
    ? PRESET_ROUTES.filter((r) => r.category === selectedCategory)
    : PRESET_ROUTES;

  const handleSelectRoute = async (preset: PresetRoute) => {
    if (
      !confirm(
        `「${preset.name}」を展開しますか？\n\n${preset.books.length}冊の書籍が登録され、学習を開始できます。`
      )
    ) {
      return;
    }

    setIsLoading(true);
    try {
      const booksToInsert = generateBooksFromPreset(preset);
      
      // DBに一括挿入
      for (const book of booksToInsert) {
        await bookRepo.create(book);
      }

      // プリセット展開完了フラグを保存
      await settingsRepo.set('@chiritsumo_preset_route_selected', preset.id);

      alert(`✅ ${preset.name}を展開しました！\n学習を開始しましょう。`);
      router.replace('/(tabs)/quest');
    } catch (e: any) {
      alert(`エラーが発生しました: ${e?.message ?? '不明なエラー'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    // スキップしても次回表示しないためフラグを保存
    await settingsRepo.set('@chiritsumo_preset_route_selected', 'skipped');
    router.replace('/(tabs)/quest');
  };

  return (
    <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: Math.max(60, insets.top + 40), paddingBottom: insets.bottom + 40 },
        ]}
      >
        <View style={styles.header}>
          <Zap size={48} color="#00F260" strokeWidth={2} />
          <Text style={styles.title}>学習ルートを選択</Text>
          <Text style={styles.subtitle}>
            人気の資格試験・スキル習得ルートをワンタップで展開できます
          </Text>
        </View>

        {/* カテゴリフィルタ */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterChip, selectedCategory === null && styles.filterChipActive]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text style={[styles.filterText, selectedCategory === null && styles.filterTextActive]}>
              すべて
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, selectedCategory === 'exam' && styles.filterChipActive]}
            onPress={() => setSelectedCategory('exam')}
          >
            <Text style={[styles.filterText, selectedCategory === 'exam' && styles.filterTextActive]}>
              資格試験
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, selectedCategory === 'programming' && styles.filterChipActive]}
            onPress={() => setSelectedCategory('programming')}
          >
            <Text style={[styles.filterText, selectedCategory === 'programming' && styles.filterTextActive]}>
              プログラミング
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, selectedCategory === 'language' && styles.filterChipActive]}
            onPress={() => setSelectedCategory('language')}
          >
            <Text style={[styles.filterText, selectedCategory === 'language' && styles.filterTextActive]}>
              語学
            </Text>
          </TouchableOpacity>
        </View>

        {/* ルート一覧 */}
        <View style={styles.routesContainer}>
          {filteredRoutes.map((preset) => {
            const Icon = CATEGORY_ICONS[preset.category];
            const difficultyColor = DIFFICULTY_COLORS[preset.difficulty];
            const difficultyLabel = DIFFICULTY_LABELS[preset.difficulty];

            return (
              <TouchableOpacity
                key={preset.id}
                style={styles.routeCard}
                onPress={() => handleSelectRoute(preset)}
                disabled={isLoading}
              >
                <View style={styles.routeHeader}>
                  <View style={[styles.iconBadge, { backgroundColor: `${difficultyColor}20` }]}>
                    <Icon size={24} color={difficultyColor} strokeWidth={2} />
                  </View>
                  <View style={styles.routeHeaderText}>
                    <Text style={styles.routeName}>{preset.name}</Text>
                    <Text style={styles.routeDescription}>{preset.description}</Text>
                  </View>
                </View>

                <View style={styles.routeMeta}>
                  <View style={[styles.difficultyBadge, { backgroundColor: `${difficultyColor}20` }]}>
                    <Text style={[styles.difficultyText, { color: difficultyColor }]}>
                      {difficultyLabel}
                    </Text>
                  </View>
                  <Text style={styles.metaText}>📚 {preset.books.length}冊</Text>
                  <Text style={styles.metaText}>📅 約{preset.estimatedDays}日</Text>
                </View>

                <View style={styles.routeFooter}>
                  <Text style={styles.footerText}>タップして展開</Text>
                  <ChevronRight size={20} color="#00F260" strokeWidth={2.5} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* スキップボタン */}
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>自分で登録する</Text>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
  },
  filterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  filterChipActive: {
    backgroundColor: 'rgba(0, 242, 96, 0.15)',
    borderColor: '#00F260',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  filterTextActive: {
    color: '#00F260',
  },
  routesContainer: {
    gap: 16,
  },
  routeCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeHeaderText: {
    flex: 1,
  },
  routeName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  routeDescription: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
  },
  routeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  metaText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  routeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.1)',
  },
  footerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00F260',
  },
  skipButton: {
    marginTop: 32,
    paddingVertical: 16,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 15,
    color: '#94A3B8',
    fontWeight: '500',
  },
});
