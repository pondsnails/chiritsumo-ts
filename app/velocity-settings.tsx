/**
 * Velocity設定画面
 * 学習速度に基づく動的目標設定
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ArrowLeft, TrendingUp, Clock, Zap } from 'lucide-react-native';
import { colors } from '@/app/core/theme/colors';
import { glassEffect } from '@/app/core/theme/glassEffect';
import { useSubscriptionStore } from '@/app/core/store/subscriptionStore';
import {
  getVelocityData,
  getVelocitySettings,
  setDesiredDailyMinutes,
  enableAutoAdjust,
} from '@/app/core/services/velocityService';
import type { VelocityData, VelocitySettings } from '@/app/core/services/velocityService';

export default function VelocitySettingsScreen() {
  const router = useRouter();
  const { isProUser } = useSubscriptionStore();
  
  const [velocityData, setVelocityData] = useState<VelocityData | null>(null);
  const [settings, setSettings] = useState<VelocitySettings | null>(null);
  const [desiredMinutes, setDesiredMinutes] = useState('30');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [data, currentSettings] = await Promise.all([
        getVelocityData(),
        getVelocitySettings(),
      ]);
      
      setVelocityData(data);
      setSettings(currentSettings);
      
      if (currentSettings.desiredDailyMinutes) {
        setDesiredMinutes(currentSettings.desiredDailyMinutes.toString());
      }
    } catch (error) {
      console.error('Failed to load velocity data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetTarget = async () => {
    if (!velocityData?.measurementCompleted) {
      Alert.alert('計測未完了', '最初の3日間の学習データを収集中です。もう少しお待ちください。');
      return;
    }

    const minutes = parseInt(desiredMinutes, 10);
    if (isNaN(minutes) || minutes < 5 || minutes > 480) {
      Alert.alert('入力エラー', '5分〜480分の範囲で入力してください。');
      return;
    }

    try {
      const calculatedTarget = await setDesiredDailyMinutes(minutes);
      Alert.alert(
        '目標を設定しました',
        `1日${minutes}分の学習で、目標は ${calculatedTarget} Lex になります。\n\nあなたの平均学習速度: ${velocityData.averageVelocity?.toFixed(1)} Lex/分`
      );
      await loadData();
    } catch (error) {
      Alert.alert('エラー', '目標の設定に失敗しました。');
    }
  };

  const handleToggleAutoAdjust = async (enabled: boolean) => {
    if (!isProUser && enabled) {
      Alert.alert(
        'Pro版限定機能',
        '目標の自動調整はPro版でのみ利用可能です。\n\n達成率に応じて、AIが最適な目標を自動的に提案します。',
        [
          { text: 'キャンセル', style: 'cancel' },
          { text: 'Pro版を見る', onPress: () => router.push('/(tabs)/settings') },
        ]
      );
      return;
    }

    if (enabled) {
      await enableAutoAdjust();
      Alert.alert(
        '自動調整を有効化',
        '7日間の達成率をもとに、AIが自動的に目標を調整します。'
      );
    }
    
    await loadData();
  };

  if (isLoading) {
    return (
      <LinearGradient colors={[colors.background, colors.backgroundDark]} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <Text style={styles.loadingText}>読み込み中...</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const isMeasurementComplete = velocityData?.measurementCompleted ?? false;
  const averageVelocity = velocityData?.averageVelocity ?? 0;
  const measurementDays = velocityData?.measurements.length ?? 0;

  return (
    <LinearGradient colors={[colors.background, colors.backgroundDark]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft color={colors.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Velocity設定</Text>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          {/* 計測状況 */}
          <View style={[glassEffect.containerLarge, styles.statusCard]}>
            <View style={styles.statusHeader}>
              <TrendingUp color={isMeasurementComplete ? colors.success : colors.warning} size={32} />
              <View style={styles.statusTextContainer}>
                <Text style={styles.statusTitle}>
                  {isMeasurementComplete ? '計測完了' : '計測中...'}
                </Text>
                <Text style={styles.statusSubtitle}>
                  {isMeasurementComplete
                    ? `平均学習速度: ${averageVelocity.toFixed(1)} Lex/分`
                    : `${measurementDays} / 3日間完了`}
                </Text>
              </View>
            </View>

            {!isMeasurementComplete && (
              <Text style={styles.statusDescription}>
                最初の3日間は、あなたの学習速度を計測しています。
                普段通りに学習を続けてください。
              </Text>
            )}
          </View>

          {/* 目標設定 */}
          {isMeasurementComplete && (
            <>
              <View style={[glassEffect.card, styles.inputCard]}>
                <View style={styles.inputHeader}>
                  <Clock color={colors.primary} size={24} />
                  <Text style={styles.inputLabel}>1日何分勉強しますか？</Text>
                </View>
                
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    value={desiredMinutes}
                    onChangeText={setDesiredMinutes}
                    keyboardType="number-pad"
                    placeholder="30"
                    placeholderTextColor={colors.textTertiary}
                  />
                  <Text style={styles.inputUnit}>分</Text>
                </View>

                {desiredMinutes && !isNaN(parseInt(desiredMinutes, 10)) && (
                  <Text style={styles.calculatedTarget}>
                    → 目標: {Math.floor(averageVelocity * parseInt(desiredMinutes, 10))} Lex
                  </Text>
                )}

                <TouchableOpacity style={styles.setButton} onPress={handleSetTarget}>
                  <Text style={styles.setButtonText}>目標を設定</Text>
                </TouchableOpacity>
              </View>

              {/* 自動調整（Pro版限定） */}
              <View style={[glassEffect.card, styles.autoAdjustCard]}>
                <View style={styles.autoAdjustHeader}>
                  <Zap color={isProUser ? colors.success : colors.textTertiary} size={24} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.autoAdjustTitle}>目標の自動調整</Text>
                    {!isProUser && (
                      <Text style={styles.proLabel}>Pro版限定</Text>
                    )}
                    <Text style={styles.autoAdjustDescription}>
                      達成率に応じて、AIが自動的に最適な目標を提案します
                    </Text>
                  </View>
                  <Switch
                    value={settings?.autoAdjustEnabled ?? false}
                    onValueChange={handleToggleAutoAdjust}
                    trackColor={{ false: colors.surfaceBorder, true: colors.success + '60' }}
                    thumbColor={settings?.autoAdjustEnabled ? colors.success : colors.surface}
                  />
                </View>
              </View>

              {/* 現在の設定 */}
              {settings?.calculatedTarget && (
                <View style={[glassEffect.card, styles.currentSettingCard]}>
                  <Text style={styles.currentSettingLabel}>現在の設定</Text>
                  <Text style={styles.currentSettingValue}>
                    目標: {settings.calculatedTarget} Lex / 日
                  </Text>
                  <Text style={styles.currentSettingSubtext}>
                    （約 {settings.desiredDailyMinutes} 分の学習）
                  </Text>
                </View>
              )}
            </>
          )}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginLeft: 8,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 100,
  },
  statusCard: {
    padding: 20,
    marginBottom: 24,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  statusSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  statusDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  inputCard: {
    padding: 20,
    marginBottom: 16,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputUnit: {
    fontSize: 18,
    color: colors.textSecondary,
  },
  calculatedTarget: {
    fontSize: 14,
    color: colors.primary,
    marginTop: 12,
    fontWeight: '600',
  },
  setButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  setButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background,
  },
  autoAdjustCard: {
    padding: 20,
    marginBottom: 16,
  },
  autoAdjustHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  autoAdjustTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  proLabel: {
    fontSize: 11,
    color: colors.warning,
    fontWeight: '700',
    marginBottom: 4,
  },
  autoAdjustDescription: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  currentSettingCard: {
    padding: 20,
    alignItems: 'center',
  },
  currentSettingLabel: {
    fontSize: 12,
    color: colors.textTertiary,
    marginBottom: 8,
  },
  currentSettingValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.success,
    marginBottom: 4,
  },
  currentSettingSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
