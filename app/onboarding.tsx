import { useState } from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useServices } from '@core/di/ServicesProvider';
import { Book, Target, TrendingUp, Zap, Gift, Users } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableScale } from '@core/components/PressableScale';

const { width } = Dimensions.get('window');

interface OnboardingSlide {
  icon: typeof Book;
  title: string;
  description: string;
  details: string[];
}

const slides: OnboardingSlide[] = [
  {
    icon: Book,
    title: 'ChiriTsumoへようこそ',
    description: '間隔反復で知識を定着',
    details: [
      '読んだ本の復習をサポート',
      '科学的アルゴリズム(FSRS)採用',
      'ゲーム感覚で学習習慣化',
    ],
  },
  {
    icon: Target,
    title: 'クエストで毎日の学習',
    description: '毎日のクエストで知識定着',
    details: [
      '復習カードが自動表示',
      '定着度で復習日を自動調整',
      '継続でカードレベル上昇',
    ],
  },
  {
    icon: TrendingUp,
    title: 'マイルートで学習計画',
    description: '教材の依存関係を設定',
    details: [
      '基礎から応用へ最適順序',
      '依存関係を可視化',
      '効率的な知識の積み上げ',
    ],
  },
  {
    icon: Zap,
    title: 'Lexポイントシステム',
    description: '学習でポイント獲得',
    details: [
      '学習でLex獲得',
      '新規教材にLex消費',
      '目標設定で習慣化',
    ],
  },
  {
    icon: Users,
    title: 'おすすめルート',
    description: '効率的な学習順序',
    details: [
      '厳選ルートを参考',
      'リンクで書籍購入',
      '他ユーザーの経路参照',
    ],
  },
  {
    icon: Gift,
    title: '⚠️ 重要: バックアップ',
    description: '機種変更前に手動バックアップ必須',
    details: [
      '❌ サーバー保存なし',
      '❌ 端末紛失で自動復元不可',
      '✅ 設定→JSONエクスポート実行',
    ],
  },
];

export default function Onboarding() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const router = useRouter();
  const { useOnboardingStore } = useServices();
  const { completeOnboarding } = useOnboardingStore();
  const insets = useSafeAreaInsets();

  const isLastSlide = currentIndex === slides.length - 1;

  const handleNext = () => {
    if (isLastSlide) {
      handleFinish();
    } else {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
    }
  };

  const handleSkip = () => {
    handleFinish();
  };

  const handleFinish = async () => {
    try {
      console.log('[Onboarding] Completing onboarding...');
      await completeOnboarding();
      console.log('[Onboarding] Onboarding completed, navigating to quest...');
      router.replace('/(tabs)/quest');
    } catch (error) {
      console.error('[Onboarding] Failed to complete onboarding:', error);
      // エラーが発生してもQuest画面に遷移（初回起動時はDBが未初期化の可能性）
      router.replace('/(tabs)/quest');
    }
  };

  const slide = slides[currentIndex];
  const Icon = slide.icon;

  return (
    <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.container}>
      {/* Header (absolute) */}
      <View style={[styles.header, { paddingTop: Math.max(16, insets.top + 8) }]}>
        <Text style={styles.pageIndicator}>
          {currentIndex + 1} / {slides.length}
        </Text>
        {!isLastSlide && (
          <TouchableOpacity onPress={handleSkip}>
            <Text style={styles.skipButton}>スキップ</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Centered content */}
      <Animated.View key={currentIndex} entering={FadeIn.duration(250)} style={styles.centerWrapper}>
        <View style={styles.iconContainer}>
          <Icon size={64} color="#00F260" strokeWidth={1.5} />
        </View>

        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.description}>{slide.description}</Text>

        <View style={styles.detailsContainer}>
          {slide.details.map((detail, index) => (
            <View key={index} style={styles.detailRow}>
              <View style={styles.bullet} />
              <Text style={styles.detailText}>{detail}</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      {/* Footer (absolute) */}
      <View style={[styles.footer, { paddingBottom: Math.max(24, insets.bottom + 16) }]}>
        <View style={styles.dotsContainer}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex && styles.activeDot,
              ]}
            />
          ))}
        </View>

        <PressableScale style={styles.nextButton} onPress={handleNext} scaleTo={0.95}>
          <LinearGradient
            colors={['#00F260', '#0575E6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.nextButtonGradient}
          >
            <Text style={styles.nextButtonText}>
              {isLastSlide ? '始める' : '次へ'}
            </Text>
          </LinearGradient>
        </PressableScale>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  pageIndicator: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
  },
  skipButton: {
    fontSize: 14,
    color: '#00F260',
    fontWeight: '600',
  },
  centerWrapper: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0, 242, 96, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  detailsContainer: {
    width: '100%',
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00F260',
    marginTop: 8,
  },
  detailText: {
    flex: 1,
    fontSize: 14,
    color: '#CBD5E1',
    lineHeight: 22,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 32,
    gap: 24,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#334155',
  },
  activeDot: {
    backgroundColor: '#00F260',
    width: 24,
  },
  nextButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  nextButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
