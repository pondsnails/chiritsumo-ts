import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useOnboardingStore } from '@core/store/onboardingStore';
import { Book, Target, TrendingUp, Zap, Gift, Users } from 'lucide-react-native';

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
    description: '間隔反復学習で知識を定着させるアプリです',
    details: [
      '読んだ本の内容を忘れないよう復習をサポート',
      '科学的根拠に基づいた間隔反復アルゴリズム(FSRS)を採用',
      '効率的な学習でゲーム感覚で知識を積み上げ',
    ],
  },
  {
    icon: Target,
    title: 'クエストで毎日の学習',
    description: '毎日のクエストをクリアして知識を定着',
    details: [
      '復習が必要なカードが自動的に表示されます',
      '記憶の定着度に応じて次の復習日を自動調整',
      '復習を続けるとカードのレベルが上がります',
    ],
  },
  {
    icon: TrendingUp,
    title: 'マイルートで学習計画',
    description: '書籍の依存関係を設定して効率的に学習',
    details: [
      '基礎となる本を先に学習してから応用へ',
      '依存関係を可視化して学習の道筋を確認',
      '最適な学習順序で知識を積み上げ',
    ],
  },
  {
    icon: Zap,
    title: 'Lexポイントシステム',
    description: '学習量に応じてポイントが貯まります',
    details: [
      '学習するとLexポイントを獲得',
      '新しい本を購入するにはLexが必要',
      '毎日の目標Lexを設定して習慣化',
    ],
  },
  {
    icon: Users,
    title: 'おすすめルート',
    description: '効率的な学習順序を提案',
    details: [
      '厳選された書籍ルートを参考に学習',
      'アフィリエイトリンクで書籍を購入可能',
      '他のユーザーの学習経路を参考にできます',
    ],
  },
  {
    icon: Gift,
    title: 'さあ、始めましょう',
    description: '今日から知識の積み上げをスタート',
    details: [
      'まずは読んだ本を登録してみましょう',
      '本に関連するカードを作成します',
      '毎日少しずつ復習して知識を定着させましょう',
    ],
  },
];

export default function Onboarding() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const router = useRouter();
  const { completeOnboarding } = useOnboardingStore();

  const isLastSlide = currentIndex === slides.length - 1;

  const handleNext = () => {
    if (isLastSlide) {
      handleFinish();
    } else {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      scrollViewRef.current?.scrollTo({
        x: nextIndex * width,
        animated: true,
      });
    }
  };

  const handleSkip = () => {
    handleFinish();
  };

  const handleFinish = async () => {
    await completeOnboarding();
    router.replace('/(tabs)/quest');
  };

  const slide = slides[currentIndex];
  const Icon = slide.icon;

  return (
    <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.pageIndicator}>
          {currentIndex + 1} / {slides.length}
        </Text>
        {!isLastSlide && (
          <TouchableOpacity onPress={handleSkip}>
            <Text style={styles.skipButton}>スキップ</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        style={styles.scrollView}
      >
        {slides.map((_, index) => (
          <View key={index} style={[styles.slide, { width }]} />
        ))}
      </ScrollView>

      <View style={styles.content}>
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
      </View>

      <View style={styles.footer}>
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

        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
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
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
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
  scrollView: {
    flex: 0,
  },
  slide: {
    height: 1,
  },
  content: {
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
    paddingHorizontal: 32,
    paddingBottom: 48,
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
