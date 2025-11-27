import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Download, Upload, Trash2, Info, CreditCard, ListChecks } from 'lucide-react-native';
import { colors } from '@core/theme/colors';
import { glassEffect } from '@core/theme/glassEffect';
import { useBackupService } from '@core/services/backupService';
import { useBookStore } from '@core/store/bookStore';
import { useCardStore } from '@core/store/cardStore';
import { useSubscriptionStore } from '@core/store/subscriptionStore';
import { useOnboardingStore } from '@core/store/onboardingStore';
import { DrizzleBookRepository } from '@core/repository/BookRepository';
import { DrizzleInventoryPresetRepository } from '@core/repository/InventoryPresetRepository';
import { 
  getUserLexSettings,
  saveUserLexSettings,
  getDailyLexTarget,
  getAvailableProfilesForFree,
  getAllProfiles
} from '@core/services/lexSettingsService';
import { LEX_PROFILES } from '@core/types/lexProfile';
import i18n from '@core/i18n';

export default function SettingsScreen() {
  const router = useRouter();
  const { exportBackup, importBackup } = useBackupService();
  const { fetchBooks } = useBookStore();
  const { isProUser, devToggleProStatus } = useSubscriptionStore();
  const { resetOnboarding } = useOnboardingStore();
  
  // Repository instances
  const bookRepo = new DrizzleBookRepository();
  const presetRepo = new DrizzleInventoryPresetRepository();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState('moderate');
  const [customLexTarget, setCustomLexTarget] = useState('200');
  const [dailyLexTarget, setDailyLexTarget] = useState(200);
  const [forceUpdate, setForceUpdate] = useState(0); // 強制再レンダリング用

  // 開発モードチェック
  const isDevelopment = process.env.NODE_ENV === 'development';

  useEffect(() => {
    loadLexSettings();
  }, []);

  // Pro版ステータス変更時にLex設定を再読み込み
  useEffect(() => {
    loadLexSettings();
  }, [isProUser]);

  const loadLexSettings = async () => {
    const settings = await getUserLexSettings();
    setSelectedProfileId(settings.profileId);
    
    if (settings.profileId === 'custom' && settings.customTarget) {
      setCustomLexTarget(settings.customTarget.toString());
    }
    
    const target = await getDailyLexTarget();
    setDailyLexTarget(target);
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await exportBackup();
      Alert.alert(i18n.t('common.success'), i18n.t('settings.exportSuccess'));
    } catch (error) {
      console.error('Export failed:', error);
      Alert.alert(i18n.t('common.error'), i18n.t('settings.exportError'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    Alert.alert(
      'バックアップの復元モード',
      '現在のデータにどう適用しますか？',
      [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        {
          text: 'マージ（推奨）',
          onPress: async () => {
            try {
              setIsImporting(true);
              const result = await importBackup({ mode: 'merge' });
              await fetchBooks();
              const msg = `書籍: +${result.booksAdded} / 更新 ${result.booksUpdated}\nカード: ${result.cardsUpserted}\n台帳: +${result.ledgerAdded}`;
              Alert.alert(
                i18n.t('common.success'),
                `バックアップをマージしました。\n\n${msg}`,
                [
                  { text: 'OK', onPress: () => router.push('/(tabs)/route' as any) }
                ]
              );
            } catch (error) {
              console.error('Import failed:', error);
              Alert.alert(i18n.t('common.error'), i18n.t('settings.importError'));
            } finally {
              setIsImporting(false);
            }
          },
        },
        {
          text: '完全復元（全削除→復元）',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsImporting(true);
              const result = await importBackup({ mode: 'overwrite' });
              await fetchBooks();
              const msg = `書籍: ${result.booksAdded}件\nカード: ${result.cardsUpserted}件\n台帳: ${result.ledgerAdded}件`;
              Alert.alert(
                i18n.t('common.success'),
                `完全復元が完了しました。\n\n${msg}`,
                [
                  { text: 'OK', onPress: () => router.push('/(tabs)/route' as any) }
                ]
              );
            } catch (error) {
              console.error('Import failed:', error);
              Alert.alert(i18n.t('common.error'), i18n.t('settings.importError'));
            } finally {
              setIsImporting(false);
            }
          },
        },
      ]
    );
  };

  const handleResetData = () => {
    Alert.alert(
      i18n.t('settings.deleteAllTitle'),
      i18n.t('settings.deleteAllMessage'),
      [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        {
          text: i18n.t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              // 全テーブルのデータを削除
              const allBooks = await bookRepo.findAll();
              for (const book of allBooks) {
                await bookRepo.delete(book.id);
              }
              
              const allPresets = await presetRepo.findAll();
              for (const preset of allPresets) {
                await presetRepo.delete(preset.id);
              }

              // 取得できない場合に備えてIndexedDB/SQLiteを直接クリア
              await fetchBooks();
              
              Alert.alert(i18n.t('common.success'), i18n.t('settings.deleteAllSuccess'));
            } catch (error) {
              console.error('Failed to reset data:', error);
              Alert.alert(i18n.t('common.error'), i18n.t('settings.deleteAllError'));
            }
          },
        },
      ]
    );
  };

  const handleLexProfileChange = async (profileId: string) => {
    const profile = LEX_PROFILES.find(p => p.id === profileId);
    
    // Pro限定プロファイルチェック
    if (profile?.isPro && !isProUser) {
      Alert.alert(
        'Pro Plan限定',
        `「${profile.name}」プロファイルはPro Planでのみ利用可能です。`,
        [
          { text: i18n.t('common.cancel'), style: 'cancel' },
          { text: 'Pro Planを見る', onPress: () => router.push('/paywall') },
        ]
      );
      return;
    }
    
    try {
      await saveUserLexSettings({ profileId });
      setSelectedProfileId(profileId);
      await loadLexSettings();
      Alert.alert('設定完了', `Lex目標を「${profile?.name}」に変更しました。`);
    } catch (error) {
      Alert.alert(i18n.t('common.error'), '設定の保存に失敗しました');
    }
  };

  const handleCustomLexSave = async () => {
    if (!isProUser) {
      Alert.alert(
        'Pro Plan限定',
        'カスタムLex目標はPro Planでのみ利用可能です。',
        [
          { text: i18n.t('common.cancel'), style: 'cancel' },
          { text: 'Pro Planを見る', onPress: () => router.push('/paywall') },
        ]
      );
      return;
    }
    
    const target = parseInt(customLexTarget, 10);
    
    if (isNaN(target) || target < 50 || target > 1000) {
      Alert.alert('エラー', 'Lex目標は50〜1000の範囲で入力してください');
      return;
    }
    
    try {
      await saveUserLexSettings({ profileId: 'custom', customTarget: target });
      setSelectedProfileId('custom');
      await loadLexSettings();
      Alert.alert('設定完了', `カスタムLex目標（${target} Lex/日）を保存しました。`);
    } catch (error) {
      Alert.alert(i18n.t('common.error'), '設定の保存に失敗しました');
    }
  };

  const handleUpgradeToPro = () => {
    router.push('/paywall');
  };

  // 開発用: Pro版トグル
  const handleDevTogglePro = () => {
    devToggleProStatus();
    // 状態変更後に強制的に再レンダリング
    setForceUpdate(prev => prev + 1);
  };

  // 開発用: オンボーディングリセット
  const handleDevResetOnboarding = () => {
    Alert.alert(
      'オンボーディングリセット',
      'アプリを再起動すると初回起動時のチュートリアルが再表示されます。',
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: 'リセット', 
          style: 'destructive',
          onPress: async () => {
            await resetOnboarding();
            Alert.alert('完了', 'アプリを再起動してください');
          }
        },
      ]
    );
  };

  // 開発用: カードリセット
  const handleDevResetCards = () => {
    Alert.alert(
      'カードリセット',
      'すべてのカードを新規状態にリセットします。\n\n• FSRS学習データを削除\n• すべて"New"状態に戻る\n• 書籍データは保持されます',
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: 'リセット', 
          style: 'destructive',
          onPress: async () => {
            try {
              const { resetAllCards } = useCardStore.getState();
              await resetAllCards();
              Alert.alert('完了', 'すべてのカードを新規状態にリセットしました。');
            } catch (error) {
              console.error('Failed to reset cards:', error);
              Alert.alert('エラー', 'カードのリセットに失敗しました');
            }
          }
        },
      ]
    );
  };

  return (
    <LinearGradient colors={[colors.background, colors.backgroundDark]} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>{i18n.t('settings.title')}</Text>
            <Text style={styles.subtitle}>{i18n.t('settings.subtitle')}</Text>
          </View>

          {/* Lex目標設定セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>学習目標設定</Text>
            
            {/* Velocity設定へのリンク（推奨） */}
            <TouchableOpacity
              style={[glassEffect.card, styles.velocityCard]}
              onPress={() => router.push('/velocity-settings' as any)}
            >
              <View style={styles.velocityContent}>
                <Text style={styles.velocityBadge}>推奨</Text>
                <Text style={styles.velocityTitle}>学習速度ベースの目標設定</Text>
                <Text style={styles.velocityDescription}>
                  あなたの実際の学習ペースを計測し、「1日何分勉強したいか」から自動的に目標を算出します
                </Text>
              </View>
            </TouchableOpacity>
            
            <View style={[glassEffect.card, styles.lexProfileCard]}>
              <Text style={styles.lexProfileTitle}>日次Lex目標: {dailyLexTarget} Lex（約{Math.round(dailyLexTarget / 10)}分）</Text>
              <Text style={styles.lexProfileHint}>または従来のプリセットから選択</Text>
              
              {/* プリセットプロファイル選択 */}
              {(isProUser ? getAllProfiles() : getAvailableProfilesForFree()).map((profile) => (
                <TouchableOpacity
                  key={profile.id}
                  style={[
                    styles.profileOption,
                    selectedProfileId === profile.id && styles.profileOptionSelected,
                  ]}
                  onPress={() => handleLexProfileChange(profile.id)}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={[
                        styles.profileName,
                        selectedProfileId === profile.id && styles.profileNameSelected,
                      ]}>
                        {profile.name}
                      </Text>
                      {profile.isPro && (
                        <View style={styles.proChip}>
                          <Text style={styles.proChipText}>Pro</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.profileDescription}>{profile.description}</Text>
                    <Text style={styles.profileTarget}>{profile.dailyLexTarget} Lex/日（約{Math.round(profile.dailyLexTarget / 10)}分）</Text>
                  </View>
                  {selectedProfileId === profile.id && (
                    <View style={styles.checkmark}>
                      <Text style={styles.checkmarkText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
              
              {/* カスタム設定（Pro版のみ） */}
              {isProUser && (
                <View style={styles.customLexSection}>
                  <Text style={styles.customLexTitle}>カスタム設定（Pro版）</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <TextInput
                      style={styles.customLexInput}
                      placeholder="50〜1000"
                      placeholderTextColor={colors.textTertiary}
                      value={customLexTarget}
                      onChangeText={setCustomLexTarget}
                      keyboardType="number-pad"
                    />
                    <Text style={styles.customLexUnit}>Lex/日</Text>
                    <TouchableOpacity
                      style={styles.customLexButton}
                      onPress={handleCustomLexSave}
                    >
                      <Text style={styles.customLexButtonText}>設定</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* データ管理セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>データ管理</Text>
            
            {/* バックアップ方針の説明 */}
            <View style={[glassEffect.card, styles.policyCard]}>
              <Text style={styles.policyText}>
                本アプリは手動バックアップのみ対応（自動/クラウド連携なし）。定期的にエクスポートし、任意のクラウドドライブへ保存してください。
              </Text>
            </View>
            
            <TouchableOpacity
              style={[glassEffect.card, styles.menuItem]}
              onPress={handleExport}
              disabled={isExporting}
            >
              <View style={styles.menuItemLeft}>
                <Download color={colors.primary} size={20} strokeWidth={2} />
                <Text style={styles.menuItemText}>バックアップをエクスポート</Text>
              </View>
              {isExporting && <ActivityIndicator color={colors.primary} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[glassEffect.card, styles.menuItem]}
              onPress={handleImport}
              disabled={isImporting}
            >
              <View style={styles.menuItemLeft}>
                <Upload color={colors.primary} size={20} strokeWidth={2} />
                <Text style={styles.menuItemText}>バックアップをインポート</Text>
              </View>
              {isImporting && <ActivityIndicator color={colors.primary} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[glassEffect.card, styles.menuItem]}
              onPress={handleResetData}
            >
              <View style={styles.menuItemLeft}>
                <Trash2 color={colors.error} size={20} strokeWidth={2} />
                <Text style={[styles.menuItemText, { color: colors.error }]}>
                  全データを削除
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* 課金セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>課金プラン</Text>
            
            {isProUser ? (
              <View style={[glassEffect.card, styles.planCard]}>
                <View style={styles.planHeader}>
                  <Text style={styles.planTitle}>Pro Plan</Text>
                  <View style={[styles.planBadge, { backgroundColor: colors.success + '20' }]}>
                    <Text style={[styles.planBadgeText, { color: colors.success }]}>現在のプラン</Text>
                  </View>
                </View>
                <Text style={styles.planDescription}>参考書登録: 無制限</Text>
                <Text style={styles.planDescription}>全機能利用可能</Text>
              </View>
            ) : (
              <>
                <View style={[glassEffect.card, styles.planCard]}>
                  <View style={styles.planHeader}>
                    <Text style={styles.planTitle}>Free Plan</Text>
                    <View style={styles.planBadge}>
                      <Text style={styles.planBadgeText}>現在のプラン</Text>
                    </View>
                  </View>
                  <Text style={styles.planDescription}>参考書登録: 3冊まで</Text>
                </View>

                <TouchableOpacity
                  style={[glassEffect.card, styles.upgradeCard]}
                  onPress={handleUpgradeToPro}
                >
                  <View style={styles.menuItemLeft}>
                    <CreditCard color={colors.success} size={20} strokeWidth={2} />
                    <View>
                      <Text style={styles.upgradeTitle}>Pro Planにアップグレード</Text>
                      <Text style={styles.upgradePrice}>買い切り: ¥3,600</Text>
                      <Text style={[styles.upgradePrice, { color: colors.textTertiary, fontSize: 12 }]}>年額: ¥1,500 / 年</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* アプリ情報セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>アプリ情報</Text>
            
            <TouchableOpacity
              style={[glassEffect.card, styles.menuItem]}
              onPress={() => router.push('/cards' as any)}
            >
              <View style={styles.menuItemLeft}>
                <ListChecks color={colors.primary} size={20} strokeWidth={2} />
                <Text style={styles.menuItemText}>カード一覧（全データ公開）</Text>
              </View>
            </TouchableOpacity>

            <View style={[glassEffect.card, styles.menuItem]}>
              <View style={styles.menuItemLeft}>
                <Info color={colors.textSecondary} size={20} strokeWidth={2} />
                <Text style={styles.menuItemText}>バージョン</Text>
              </View>
              <Text style={styles.versionText}>7.0.0</Text>
            </View>

            <TouchableOpacity
              style={[glassEffect.card, styles.menuItem]}
              onPress={() => router.push('/privacy-policy' as any)}
            >
              <View style={styles.menuItemLeft}>
                <Info color={colors.textSecondary} size={20} strokeWidth={2} />
                <Text style={styles.menuItemText}>プライバシーポリシー</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* 開発者向けセクション（開発モードのみ表示） */}
          {isDevelopment && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.warning }]}>
                🔧 開発者ツール
              </Text>
              
              <View style={[glassEffect.card, styles.devCard]}>
                <View style={styles.devHeader}>
                  <Text style={styles.devTitle}>開発モード</Text>
                  <View style={[styles.devBadge, { backgroundColor: colors.warning + '20' }]}>
                    <Text style={[styles.devBadgeText, { color: colors.warning }]}>DEV ONLY</Text>
                  </View>
                </View>
                <Text style={styles.devDescription}>
                  このセクションは開発環境でのみ表示されます
                </Text>
              </View>

              <TouchableOpacity
                style={[glassEffect.card, styles.devToggleCard]}
                onPress={handleDevTogglePro}
              >
                <View style={styles.menuItemLeft}>
                  <View style={[
                    styles.statusIndicator,
                    { backgroundColor: isProUser ? colors.success : colors.textTertiary }
                  ]} />
                  <View>
                    <Text style={styles.devToggleTitle}>
                      課金ステータス切り替え
                    </Text>
                    <Text style={styles.devToggleStatus}>
                      現在: {isProUser ? 'Pro版 🎉' : 'Free版'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.devToggleHint}>タップで切替</Text>
              </TouchableOpacity>

              <View style={[glassEffect.card, styles.devInfoCard]}>
                <Text style={styles.devInfoTitle}>💡 使い方</Text>
                <Text style={styles.devInfoText}>
                  • タップしてPro版/Free版を切り替え{'\n'}
                  • Pro版機能のテストに便利{'\n'}
                  • アプリ再起動後も設定が保持されます{'\n'}
                  • 本番ビルドでは表示されません
                </Text>
              </View>

              <TouchableOpacity
                style={[glassEffect.card, styles.devToggleCard]}
                onPress={handleDevResetOnboarding}
              >
                <View style={styles.menuItemLeft}>
                  <View style={[
                    styles.statusIndicator,
                    { backgroundColor: colors.textSecondary }
                  ]} />
                  <View>
                    <Text style={styles.devToggleTitle}>
                      オンボーディングリセット
                    </Text>
                    <Text style={styles.devToggleStatus}>
                      初回起動チュートリアルを再表示
                    </Text>
                  </View>
                </View>
                <Text style={styles.devToggleHint}>リセット</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[glassEffect.card, styles.devToggleCard]}
                onPress={handleDevResetCards}
              >
                <View style={styles.menuItemLeft}>
                  <View style={[
                    styles.statusIndicator,
                    { backgroundColor: colors.error }
                  ]} />
                  <View>
                    <Text style={styles.devToggleTitle}>
                      カードリセット
                    </Text>
                    <Text style={styles.devToggleStatus}>
                      すべてのカードを新規状態に戻す
                    </Text>
                  </View>
                </View>
                <Text style={styles.devToggleHint}>リセット</Text>
              </TouchableOpacity>
            </View>
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
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  section: {
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  proLabel: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 2,
  },
  lastBackupText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  versionText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  planCard: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  planBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  planBadgeText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  planDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  upgradeCard: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.success + '40',
  },
  upgradeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.success,
  },
  upgradePrice: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  lexProfileCard: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  lexProfileTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  lexProfileHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  profileOption: {
    backgroundColor: colors.surface + '20',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  profileNameSelected: {
    color: colors.primary,
  },
  profileDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },
  profileTarget: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  proChip: {
    backgroundColor: colors.warning + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  proChipText: {
    fontSize: 10,
    color: colors.warning,
    fontWeight: '700',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '700',
  },
  customLexSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
  },
  customLexTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  customLexInput: {
    flex: 1,
    backgroundColor: colors.surface + '40',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: colors.text,
  },
  customLexUnit: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  customLexButton: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  customLexButtonText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  velocityCard: {
    padding: 20,
    marginBottom: 16,
  },
  velocityContent: {
    gap: 8,
  },
  velocityBadge: {
    backgroundColor: colors.success + '20',
    color: colors.success,
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  velocityTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  velocityDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  policyCard: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    backgroundColor: colors.surface + '20',
  },
  policyText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  // 開発者ツール
  devCard: {
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  devHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  devTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  devBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  devBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  devDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  devToggleCard: {
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  devToggleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  devToggleStatus: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  devToggleHint: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  devInfoCard: {
    padding: 16,
    backgroundColor: colors.surface + '20',
    borderRadius: 12,
  },
  devInfoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  devInfoText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
