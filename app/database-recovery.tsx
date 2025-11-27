/**
 * Database Recovery Screen
 * データベース初期化失敗時のリカバリーUI
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertTriangle, RefreshCw, Trash2, Download } from 'lucide-react-native';
import { colors } from '@core/theme/colors';
import { glassEffect } from '@core/theme/glassEffect';
import { resetDatabase, restoreFromBackup } from '@core/database/databaseRecovery';
import { useRouter } from 'expo-router';

interface DatabaseRecoveryScreenProps {
  error: Error;
  backupPath?: string;
}

export default function DatabaseRecoveryScreen({ error, backupPath }: DatabaseRecoveryScreenProps) {
  const router = useRouter();
  const [isRecovering, setIsRecovering] = useState(false);

  const handleRestoreFromBackup = async () => {
    if (!backupPath) return;

    Alert.alert(
      'バックアップから復元',
      '最後の自動バックアップからデータを復元します。現在のデータは失われます。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '復元',
          style: 'default',
          onPress: async () => {
            setIsRecovering(true);
            try {
              await restoreFromBackup(backupPath);
              Alert.alert('成功', 'データベースを復元しました。アプリを再起動してください。');
              // アプリ再起動を促す
            } catch (err) {
              Alert.alert('エラー', 'バックアップからの復元に失敗しました。');
            } finally {
              setIsRecovering(false);
            }
          },
        },
      ]
    );
  };

  const handleResetDatabase = () => {
    Alert.alert(
      '⚠️ データベースをリセット',
      'すべてのデータが削除されます。この操作は取り消せません。手動バックアップがある場合は、後で復元できます。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '完全リセット',
          style: 'destructive',
          onPress: async () => {
            setIsRecovering(true);
            try {
              await resetDatabase();
              Alert.alert('完了', 'データベースをリセットしました。アプリを再起動してください。');
            } catch (err) {
              Alert.alert('エラー', 'データベースのリセットに失敗しました。');
            } finally {
              setIsRecovering(false);
            }
          },
        },
      ]
    );
  };

  const handleManualBackup = () => {
    router.push('/(tabs)/settings');
  };

  return (
    <LinearGradient colors={[colors.background, colors.backgroundDark]} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.content}>
          {/* アイコン */}
          <View style={[glassEffect.card, styles.iconContainer]}>
            <AlertTriangle color={colors.warning} size={64} strokeWidth={2} />
          </View>

          {/* メッセージ */}
          <Text style={styles.title}>データベースエラー</Text>
          <Text style={styles.subtitle}>
            データベースの初期化に失敗しました。{'\n'}
            以下の方法でリカバリーを試みてください。
          </Text>

          {/* エラー詳細 */}
          <View style={[glassEffect.card, styles.errorCard]}>
            <Text style={styles.errorTitle}>エラー詳細</Text>
            <Text style={styles.errorText}>{error.message}</Text>
          </View>

          {/* リカバリーオプション */}
          <View style={styles.optionsContainer}>
            {backupPath && (
              <TouchableOpacity
                style={[glassEffect.card, styles.optionButton]}
                onPress={handleRestoreFromBackup}
                disabled={isRecovering}
              >
                <RefreshCw color={colors.primary} size={24} />
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>自動バックアップから復元</Text>
                  <Text style={styles.optionSubtitle}>最後のバックアップ時点に戻します</Text>
                </View>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[glassEffect.card, styles.optionButton]}
              onPress={handleManualBackup}
              disabled={isRecovering}
            >
              <Download color={colors.primary} size={24} />
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>手動バックアップから復元</Text>
                <Text style={styles.optionSubtitle}>設定画面でバックアップファイルを選択</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[glassEffect.card, styles.optionButton, styles.dangerButton]}
              onPress={handleResetDatabase}
              disabled={isRecovering}
            >
              <Trash2 color={colors.error} size={24} />
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionTitle, styles.dangerText]}>データベースをリセット</Text>
                <Text style={styles.optionSubtitle}>すべてのデータを削除して最初から</Text>
              </View>
            </TouchableOpacity>
          </View>

          {isRecovering && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>処理中...</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  iconContainer: {
    alignSelf: 'center',
    padding: 24,
    borderRadius: 100,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  errorCard: {
    padding: 16,
    marginBottom: 32,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  dangerButton: {
    borderColor: colors.error + '40',
    borderWidth: 1,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  optionSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  dangerText: {
    color: colors.error,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.text,
    marginTop: 16,
  },
});
