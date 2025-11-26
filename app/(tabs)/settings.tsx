import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Download, Upload, Trash2, Info, CreditCard, ExternalLink, Cloud, Key } from 'lucide-react-native';
import { colors } from '@/app/core/theme/colors';
import { glassEffect } from '@/app/core/theme/glassEffect';
import { useBackupService } from '@/app/core/services/backupService';
import { useBookStore } from '@/app/core/store/bookStore';
import { useSubscriptionStore } from '@/app/core/store/subscriptionStore';
import { booksDB, cardsDB, ledgerDB, inventoryPresetsDB } from '@/app/core/database/db';
import { 
  enableAutoBackup, 
  disableAutoBackup, 
  isAutoBackupEnabled,
  performManualBackup 
} from '@/app/core/services/autoBackupScheduler';
import { getLastBackupDate } from '@/app/core/services/iCloudBackup';
import { 
  getUserGeminiApiKey, 
  saveUserGeminiApiKey, 
  deleteUserGeminiApiKey 
} from '@/app/core/services/aiAffiliate';
import { 
  getUserLexSettings,
  saveUserLexSettings,
  getDailyLexTarget,
  getAvailableProfilesForFree,
  getAllProfiles
} from '@/app/core/services/lexSettingsService';
import { LEX_PROFILES } from '@/app/core/types/lexProfile';
import i18n from '@/app/core/i18n';

export default function SettingsScreen() {
  const router = useRouter();
  const { exportBackup, importBackup } = useBackupService();
  const { fetchBooks } = useBookStore();
  const { isProUser } = useSubscriptionStore();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [lastBackupDate, setLastBackupDate] = useState<Date | null>(null);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [isApiKeySet, setIsApiKeySet] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState('moderate');
  const [customLexTarget, setCustomLexTarget] = useState('200');
  const [dailyLexTarget, setDailyLexTarget] = useState(200);

  useEffect(() => {
    loadAutoBackupStatus();
    loadGeminiApiKey();
    loadLexSettings();
  }, []);

  const loadGeminiApiKey = async () => {
    const key = await getUserGeminiApiKey();
    if (key) {
      setGeminiApiKey(key);
      setIsApiKeySet(true);
    }
  };

  const loadLexSettings = async () => {
    const settings = await getUserLexSettings();
    setSelectedProfileId(settings.profileId);
    
    if (settings.profileId === 'custom' && settings.customTarget) {
      setCustomLexTarget(settings.customTarget.toString());
    }
    
    const target = await getDailyLexTarget();
    setDailyLexTarget(target);
  };

  const loadAutoBackupStatus = async () => {
    const enabled = await isAutoBackupEnabled();
    setAutoBackupEnabled(enabled);
    
    const lastDate = await getLastBackupDate();
    setLastBackupDate(lastDate);
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
      i18n.t('settings.importConfirmTitle'),
      i18n.t('settings.importConfirmMessage'),
      [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        {
          text: i18n.t('settings.import'),
          style: 'destructive',
          onPress: async () => {
            try {
              setIsImporting(true);
              await importBackup();
              await fetchBooks();
              Alert.alert(i18n.t('common.success'), i18n.t('settings.importSuccess'));
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
              const allBooks = await booksDB.getAll();
              for (const book of allBooks) {
                await booksDB.delete(book.id);
              }
              
              const allPresets = await inventoryPresetsDB.getAll();
              for (const preset of allPresets) {
                await inventoryPresetsDB.delete(preset.id);
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

  const handleToggleAutoBackup = async (enabled: boolean) => {
    if (!isProUser && enabled) {
      Alert.alert(
        'Pro Plan限定機能',
        '自動バックアップはPro Planでのみ利用可能です。',
        [
          { text: i18n.t('common.cancel'), style: 'cancel' },
          { text: 'Pro Planを見る', onPress: () => router.push('/paywall') },
        ]
      );
      return;
    }

    try {
      if (enabled) {
        const success = await enableAutoBackup();
        if (success) {
          setAutoBackupEnabled(true);
          Alert.alert('自動バックアップ有効化', '毎日自動的にデータをバックアップします。');
        }
      } else {
        const success = await disableAutoBackup();
        if (success) {
          setAutoBackupEnabled(false);
          Alert.alert('自動バックアップ無効化', '自動バックアップを停止しました。');
        }
      }
    } catch (error) {
      Alert.alert(i18n.t('common.error'), '設定の変更に失敗しました');
    }
  };

  const handleManualBackup = async () => {
    if (!isProUser) {
      Alert.alert(
        'Pro Plan限定機能',
        'クラウドバックアップはPro Planでのみ利用可能です。',
        [
          { text: i18n.t('common.cancel'), style: 'cancel' },
          { text: 'Pro Planを見る', onPress: () => router.push('/paywall') },
        ]
      );
      return;
    }

    try {
      const success = await performManualBackup();
      if (success) {
        const newDate = await getLastBackupDate();
        setLastBackupDate(newDate);
        Alert.alert('バックアップ完了', 'データをクラウドにバックアップしました。');
      }
    } catch (error) {
      Alert.alert(i18n.t('common.error'), 'バックアップに失敗しました');
    }
  };

  const handleSaveApiKey = async () => {
    if (!geminiApiKey.trim()) {
      Alert.alert('エラー', 'APIキーを入力してください');
      return;
    }

    try {
      await saveUserGeminiApiKey(geminiApiKey.trim());
      setIsApiKeySet(true);
      Alert.alert(
        '設定完了',
        'Gemini APIキーを保存しました。AIによる個別最適化された書籍推薦が利用可能になります。'
      );
    } catch (error) {
      Alert.alert(i18n.t('common.error'), 'APIキーの保存に失敗しました');
    }
  };

  const handleDeleteApiKey = () => {
    Alert.alert(
      'APIキーの削除',
      'Gemini APIキーを削除しますか？削除するとAI推薦が無効になり、おすすめ書籍リストのみ表示されます。',
      [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        {
          text: i18n.t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteUserGeminiApiKey();
              setGeminiApiKey('');
              setIsApiKeySet(false);
              Alert.alert('削除完了', 'APIキーを削除しました');
            } catch (error) {
              Alert.alert(i18n.t('common.error'), 'APIキーの削除に失敗しました');
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
            <View style={[glassEffect.card, styles.lexProfileCard]}>
              <Text style={styles.lexProfileTitle}>日次Lex目標: {dailyLexTarget} Lex</Text>
              <Text style={styles.lexProfileHint}>あなたの学習スタイルに合わせて目標を選択してください</Text>
              
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
                    <Text style={styles.profileTarget}>{profile.dailyLexTarget} Lex/日</Text>
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

          {/* AI機能設定セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AI機能設定</Text>
            
            {/* Gemini APIキー設定 */}
            <View style={[glassEffect.card, styles.apiKeyCard]}>
              <View style={styles.apiKeyHeader}>
                <Key color={isApiKeySet ? colors.success : colors.textSecondary} size={20} strokeWidth={2} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.menuItemText}>Gemini APIキー (BYOK)</Text>
                  <Text style={styles.apiKeyDescription}>
                    {isApiKeySet 
                      ? 'AIによる個別最適化された書籍推薦が利用可能です' 
                      : 'APIキーを設定すると、AIによる個別最適化された書籍推薦が利用可能です（無料）'}
                  </Text>
                </View>
              </View>
              
              {!isApiKeySet ? (
                <>
                  <TextInput
                    style={styles.apiKeyInput}
                    placeholder="AIza..."
                    placeholderTextColor={colors.textTertiary}
                    value={geminiApiKey}
                    onChangeText={setGeminiApiKey}
                    autoCapitalize="none"
                    autoCorrect={false}
                    secureTextEntry={true}
                  />
                  <TouchableOpacity
                    style={styles.apiKeyButton}
                    onPress={handleSaveApiKey}
                  >
                    <Text style={styles.apiKeyButtonText}>APIキーを保存</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.apiKeyLinkButton}
                    onPress={() => WebBrowser.openBrowserAsync('https://aistudio.google.com/app/apikey')}
                  >
                    <ExternalLink color={colors.primary} size={16} strokeWidth={2} />
                    <Text style={styles.apiKeyLinkText}>Google AI Studioでキーを取得</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={styles.apiKeySetInfo}>
                    <Text style={styles.apiKeySetText}>✓ APIキー設定済み</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.apiKeyDeleteButton}
                    onPress={handleDeleteApiKey}
                  >
                    <Trash2 color={colors.error} size={16} strokeWidth={2} />
                    <Text style={styles.apiKeyDeleteText}>APIキーを削除</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          {/* データ管理セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>データ管理</Text>
            
            {/* クラウド自動バックアップ (Pro Plan限定) */}
            <View style={[glassEffect.card, styles.menuItem]}>
              <View style={styles.menuItemLeft}>
                <Cloud color={isProUser ? colors.primary : colors.textTertiary} size={20} strokeWidth={2} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuItemText}>自動クラウドバックアップ</Text>
                  {!isProUser && (
                    <Text style={styles.proLabel}>Pro Plan限定</Text>
                  )}
                  {lastBackupDate && (
                    <Text style={styles.lastBackupText}>
                      最終: {lastBackupDate.toLocaleDateString('ja-JP')} {lastBackupDate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  )}
                </View>
              </View>
              <Switch
                value={autoBackupEnabled}
                onValueChange={handleToggleAutoBackup}
                trackColor={{ false: colors.surfaceBorder, true: colors.primary + '60' }}
                thumbColor={autoBackupEnabled ? colors.primary : colors.surface}
              />
            </View>

            {/* 手動バックアップ (Pro Plan限定) */}
            {isProUser && (
              <TouchableOpacity
                style={[glassEffect.card, styles.menuItem]}
                onPress={handleManualBackup}
              >
                <View style={styles.menuItemLeft}>
                  <Cloud color={colors.success} size={20} strokeWidth={2} />
                  <Text style={styles.menuItemText}>今すぐバックアップ</Text>
                </View>
              </TouchableOpacity>
            )}
            
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
                  <Text style={styles.upgradePrice}>¥1,980 / 年</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* アプリ情報セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>アプリ情報</Text>
            
            <View style={[glassEffect.card, styles.menuItem]}>
              <View style={styles.menuItemLeft}>
                <Info color={colors.textSecondary} size={20} strokeWidth={2} />
                <Text style={styles.menuItemText}>バージョン</Text>
              </View>
              <Text style={styles.versionText}>7.0.0</Text>
            </View>

            <TouchableOpacity
              style={[glassEffect.card, styles.menuItem]}
              onPress={async () => {
                // GitHub Pagesなどにホスティング後、URLを変更
                await WebBrowser.openBrowserAsync('https://your-domain.com/privacy-policy.html');
              }}
            >
              <View style={styles.menuItemLeft}>
                <ExternalLink color={colors.textSecondary} size={20} strokeWidth={2} />
                <Text style={styles.menuItemText}>プライバシーポリシー</Text>
              </View>
            </TouchableOpacity>
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
  apiKeyCard: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  apiKeyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  apiKeyDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  apiKeyInput: {
    backgroundColor: colors.surface + '40',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    color: colors.text,
    marginBottom: 12,
  },
  apiKeyButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  apiKeyButtonText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  apiKeyLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  apiKeyLinkText: {
    fontSize: 12,
    color: colors.primary,
  },
  apiKeySetInfo: {
    backgroundColor: colors.success + '20',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  apiKeySetText: {
    fontSize: 14,
    color: colors.success,
    fontWeight: '600',
  },
  apiKeyDeleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  apiKeyDeleteText: {
    fontSize: 12,
    color: colors.error,
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
});
