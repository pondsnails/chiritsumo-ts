import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { X, Check, Crown, Sparkles } from 'lucide-react-native';
import { colors } from '@/app/core/theme/colors';
import { glassEffect } from '@/app/core/theme/glassEffect';
import { useSubscriptionStore } from '@/app/core/store/subscriptionStore';

type PlanType = 'lifetime' | 'annual';

export default function PaywallScreen() {
  const router = useRouter();
  const {
    offerings,
    isLoading,
    purchasePackage,
    restorePurchases,
    initializePurchases,
  } = useSubscriptionStore();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('lifetime');

  useEffect(() => {
    initializePurchases();
  }, []);

  const handlePurchase = async () => {
    if (!offerings || offerings.availablePackages.length === 0) {
      Alert.alert('エラー', '課金プランが取得できませんでした');
      return;
    }

    try {
      setIsPurchasing(true);
      // selectedPlanに基づいてパッケージを選択
      const targetPackage = offerings.availablePackages.find(pkg => 
        selectedPlan === 'lifetime' 
          ? pkg.identifier.includes('lifetime') 
          : pkg.identifier.includes('annual')
      ) || offerings.availablePackages[0];

      const success = await purchasePackage(targetPackage);
      
      if (success) {
        Alert.alert('成功', 'Pro機能が開放されました！', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (error) {
      Alert.alert('エラー', '購入に失敗しました');
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    try {
      setIsPurchasing(true);
      const success = await restorePurchases();
      
      if (success) {
        Alert.alert('復元完了', 'Pro機能が復元されました', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('復元失敗', '購入履歴が見つかりませんでした');
      }
    } catch (error) {
      Alert.alert('エラー', '復元に失敗しました');
    } finally {
      setIsPurchasing(false);
    }
  };

  const features = [
    { icon: '📚', title: '参考書登録数無制限', description: 'Free版は3冊まで' },
    { icon: '🎯', title: 'Velocity自動調整', description: '学習速度に合わせて目標自動最適化' },
    { icon: '🔥', title: 'ストリーク保護', description: '借金リセット時もストリーク維持' },
    { icon: '💾', title: 'ローカルバックアップ', description: '手動エクスポート機能（無料）' },
  ];

  return (
    <LinearGradient colors={[colors.background, colors.backgroundDark]} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <X color={colors.text} size={24} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* ヒーローセクション */}
          <View style={styles.heroSection}>
            <View style={styles.crownIcon}>
              <Crown color={colors.success} size={48} strokeWidth={2} />
            </View>
            <Text style={styles.heroTitle}>Chiritsumo Pro</Text>
            <Text style={styles.heroSubtitle}>
              無制限登録・学習分析AI・ストリーク保護
            </Text>
          </View>

          {/* プラン選択 */}
          <View style={styles.plansSection}>
            {/* Lifetimeプラン（推奨） */}
            <TouchableOpacity
              style={[
                glassEffect.card,
                styles.planCard,
                selectedPlan === 'lifetime' && styles.planCardSelected,
              ]}
              onPress={() => setSelectedPlan('lifetime')}
              activeOpacity={0.7}
            >
              <View style={styles.bestValueBadge}>
                <Sparkles color={colors.text} size={12} strokeWidth={2.5} />
                <Text style={styles.bestValueText}>BEST VALUE</Text>
              </View>

              <View style={styles.planHeader}>
                <Text style={styles.planTitle}>買い切りプラン</Text>
                <View style={styles.checkCircle}>
                  {selectedPlan === 'lifetime' && (
                    <Check color={colors.text} size={16} strokeWidth={3} />
                  )}
                </View>
              </View>

              <View style={styles.priceRow}>
                <Text style={styles.planPrice}>¥3,600</Text>
                <Text style={styles.planPeriod}>一度きり</Text>
              </View>

              <View style={styles.planFeatures}>
                <Text style={styles.planFeature}>✓ 一括払い・追加なし</Text>
                <Text style={styles.planFeature}>✓ 一生使える</Text>
                <Text style={styles.planFeature}>✓ Pro機能を即座に開放</Text>
              </View>
            </TouchableOpacity>

            {/* Annualプラン */}
            <TouchableOpacity
              style={[
                glassEffect.card,
                styles.planCard,
                styles.planCardSecondary,
                selectedPlan === 'annual' && styles.planCardSelected,
              ]}
              onPress={() => setSelectedPlan('annual')}
              activeOpacity={0.7}
            >
              <View style={styles.planHeader}>
                <Text style={[styles.planTitle, styles.planTitleSecondary]}>年額プラン</Text>
                <View style={styles.checkCircle}>
                  {selectedPlan === 'annual' && (
                    <Check color={colors.text} size={16} strokeWidth={3} />
                  )}
                </View>
              </View>

              <View style={styles.priceRow}>
                <Text style={[styles.planPrice, styles.planPriceSecondary]}>¥1,500</Text>
                <Text style={styles.planPeriod}>/ 年</Text>
              </View>

              <Text style={styles.planNote}>約125円/月（毎年更新）</Text>
            </TouchableOpacity>
          </View>

          {/* 機能一覧 */}
          <View style={styles.featuresSection}>
            <Text style={styles.sectionTitle}>Pro機能</Text>
            
            {features.map((feature, index) => (
              <View key={index} style={[glassEffect.card, styles.featureCard]}>
                <Text style={styles.featureIcon}>{feature.icon}</Text>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>{feature.description}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* 購入ボタン */}
          <TouchableOpacity
            style={[styles.purchaseButton, isPurchasing && styles.purchaseButtonDisabled]}
            onPress={handlePurchase}
            disabled={isPurchasing || isLoading}
          >
            {isPurchasing ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <LinearGradient
                colors={[colors.success, colors.primary]}
                style={styles.purchaseButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.purchaseButtonText}>
                  {selectedPlan === 'lifetime' ? '¥3,600で購入' : '¥1,500/年で購入'}
                </Text>
              </LinearGradient>
            )}
          </TouchableOpacity>

          {/* 復元ボタン */}
          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestore}
            disabled={isPurchasing}
          >
            <Text style={styles.restoreButtonText}>購入履歴を復元</Text>
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            支払いはApple ID/Google Playアカウントに請求されます。
          </Text>

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
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  crownIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.success + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  plansSection: {
    marginBottom: 32,
    gap: 12,
  },
  planCard: {
    padding: 20,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  planCardSelected: {
    borderColor: colors.success,
  },
  planCardSecondary: {
    opacity: 0.7,
    padding: 16,
  },
  bestValueBadge: {
    position: 'absolute',
    top: -12,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.success,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bestValueText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  planTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  planTitleSecondary: {
    fontSize: 16,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.success,
    backgroundColor: colors.success + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 8,
  },
  planPrice: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.success,
  },
  planPriceSecondary: {
    fontSize: 28,
    color: colors.textSecondary,
  },
  planPeriod: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  planFeatures: {
    gap: 6,
    marginTop: 8,
  },
  planFeature: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  planNote: {
    fontSize: 13,
    color: colors.textTertiary,
  },
  featuresSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    gap: 16,
  },
  featureIcon: {
    fontSize: 32,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  purchaseButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  purchaseButtonDisabled: {
    opacity: 0.5,
  },
  purchaseButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  purchaseButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  restoreButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  restoreButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  disclaimer: {
    fontSize: 11,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 16,
  },
});
