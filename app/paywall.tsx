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
import { X, Check, Crown } from 'lucide-react-native';
import { colors } from '@/app/core/theme/colors';
import { glassEffect } from '@/app/core/theme/glassEffect';
import { useSubscriptionStore } from '@/app/core/store/subscriptionStore';

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

  useEffect(() => {
    initializePurchases();
  }, []);

  const handlePurchase = async () => {
    if (!offerings || !offerings.availablePackages[0]) {
      Alert.alert('エラー', '課金プランが取得できませんでした');
      return;
    }

    try {
      setIsPurchasing(true);
      const success = await purchasePackage(offerings.availablePackages[0]);
      
      if (success) {
        Alert.alert('成功', 'Pro Planにアップグレードしました！', [
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
        Alert.alert('復元完了', 'Pro Planが復元されました', [
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
    { title: '参考書登録数', free: '3冊まで', pro: '無制限' },
    { title: '借金リセット時', free: 'ストリーク消滅', pro: 'ストリーク維持' },
    { title: 'AI推薦機能', free: '制限あり', pro: '無制限' },
    { title: 'バックアップ', free: '手動のみ', pro: '自動バックアップ' },
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
          <View style={styles.heroSection}>
            <View style={styles.crownIcon}>
              <Crown color={colors.success} size={48} strokeWidth={2} />
            </View>
            <Text style={styles.heroTitle}>Chiritsumo Pro</Text>
            <Text style={styles.heroSubtitle}>学習を加速させる、プレミアム機能</Text>
          </View>

          <View style={styles.featuresSection}>
            <Text style={styles.sectionTitle}>機能比較</Text>
            
            {features.map((feature, index) => (
              <View key={index} style={[glassEffect.card, styles.featureCard]}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <View style={styles.featureComparison}>
                  <View style={styles.planColumn}>
                    <Text style={styles.planLabel}>Free</Text>
                    <Text style={styles.planValue}>{feature.free}</Text>
                  </View>
                  <View style={styles.planColumn}>
                    <Text style={[styles.planLabel, { color: colors.success }]}>Pro</Text>
                    <Text style={[styles.planValue, { color: colors.success }]}>
                      {feature.pro}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.pricingSection}>
            <View style={[glassEffect.card, styles.priceCard]}>
              <Text style={styles.priceAmount}>¥1,980</Text>
              <Text style={styles.pricePeriod}>/ 年</Text>
              <Text style={styles.priceNote}>約165円/月</Text>
            </View>

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
                  <Text style={styles.purchaseButtonText}>Pro Planを購入</Text>
                </LinearGradient>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.restoreButton}
              onPress={handleRestore}
              disabled={isPurchasing || isLoading}
            >
              <Text style={styles.restoreButtonText}>購入を復元</Text>
            </TouchableOpacity>

            <Text style={styles.disclaimer}>
              購入後、自動的に更新されます。{'\n'}
              キャンセルはアカウント設定から可能です。
            </Text>
          </View>
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
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  closeButton: {
    padding: 8,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  crownIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.success + '20',
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  featuresSection: {
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  featureCard: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  featureComparison: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  planColumn: {
    flex: 1,
    alignItems: 'center',
  },
  planLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
    fontWeight: '600',
  },
  planValue: {
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
  },
  pricingSection: {
    paddingHorizontal: 16,
  },
  priceCard: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  priceAmount: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.success,
  },
  pricePeriod: {
    fontSize: 18,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  priceNote: {
    fontSize: 14,
    color: colors.textTertiary,
  },
  purchaseButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    height: 56,
  },
  purchaseButtonDisabled: {
    opacity: 0.5,
  },
  purchaseButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  purchaseButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  restoreButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  restoreButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
  disclaimer: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
