import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Download, Upload, Trash2, Info, CreditCard, ExternalLink } from 'lucide-react-native';
import { colors } from '@/app/core/theme/colors';
import { glassEffect } from '@/app/core/theme/glassEffect';
import { useBackupService } from '@/app/core/services/backupService';
import { useBookStore } from '@/app/core/store/bookStore';
import { booksDB, cardsDB, ledgerDB, inventoryPresetsDB } from '@/app/core/database/db';
import i18n from '@/app/core/i18n';

export default function SettingsScreen() {
  const router = useRouter();
  const { exportBackup, importBackup } = useBackupService();
  const { fetchBooks } = useBookStore();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

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

          {/* データ管理セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>データ管理</Text>
            
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
});
