import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { AlertCircle, Cloud, HardDrive } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { setCloudBackupEnabled } from '@core/services/cloudBackupService';
import { requestSafBackupFolder } from '@core/services/safBackupService';
import { colors } from '@core/theme/colors';
import { useServices } from '@core/di/ServicesProvider';

/**
 * BackupSetupPrompt.tsx
 * 
 * Onboarding完了後に表示される「バックアップ設定促進」画面
 * データロスト低評価爆撃を防ぐための必須ステップ
 * 
 * 選択肢:
 * 1. クラウド自動バックアップ（iCloud/Google Drive）
 * 2. 手動バックアップ（後で設定）
 * 3. スキップ（警告表示）
 */
export default function BackupSetupPrompt() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(false);
  const { settingsRepo } = useServices();

  const handleCloudBackup = async () => {
    setIsLoading(true);
    try {
      await setCloudBackupEnabled(true);
      // TODO: iCloud/Google Drive認証フロー
      // iOS: Info.plistにiCloudコンテナID追加後、自動有効化
      // Android: Google Sign-In → Drive API権限取得
      await settingsRepo.set('@chiritsumo_backup_setup_done', 'true');
      alert('クラウドバックアップを有効化しました！');
      router.replace('/(tabs)/quest');
    } catch (e) {
      alert('エラーが発生しました。後で設定から有効化できます。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualBackup = async () => {
    setIsLoading(true);
    try {
      if (Platform.OS === 'android') {
        // Android: SAFフォルダ選択
        const uri = await requestSafBackupFolder();
        if (uri) {
          await settingsRepo.set('@chiritsumo_backup_setup_done', 'true');
          alert('バックアップフォルダを設定しました！');
        } else {
          alert('フォルダ選択をキャンセルしました。\n\nExpo Goでは SAF 未提供のため、スタンドアロンビルドで再度お試しください。\n現在は設定画面から手動エクスポートできます。');
        }
      } else {
        // iOS: 手動バックアップは設定画面から
        await settingsRepo.set('@chiritsumo_backup_setup_done', 'true');
        alert('設定画面から手動バックアップを実行できます。');
      }
      router.replace('/(tabs)/quest');
    } catch (e) {
      alert('エラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    // 警告ダイアログ表示
    if (
      confirm(
        '⚠️ バックアップなしで続行しますか？\n\n端末紛失・故障時にデータが完全消失します。\n後から設定画面で有効化できます。'
      )
    ) {
      // スキップしてもフラグは立てる（次回起動時に再表示しないため）
      await settingsRepo.set('@chiritsumo_backup_setup_done', 'skip');
      router.replace('/(tabs)/quest');
    }
  };

  return (
    <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.container}>
      <View style={[styles.content, { paddingTop: Math.max(60, insets.top + 40) }]}>
        <View style={styles.iconContainer}>
          <AlertCircle size={64} color="#FF416C" strokeWidth={1.5} />
        </View>

        <Text style={styles.title}>データを守りましょう</Text>
        <Text style={styles.description}>
          スマホを水没・紛失した場合、学習データは復元できません。{'\n'}
          バックアップ方法を選んでください。
        </Text>

        <View style={styles.optionsContainer}>
          {/* オプション1: クラウド自動バックアップ（推奨） */}
          <TouchableOpacity
            style={styles.optionButton}
            onPress={handleCloudBackup}
            disabled={isLoading}
          >
            <LinearGradient
              colors={['#00F260', '#0575E6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.optionGradient}
            >
              <Cloud size={32} color="#FFFFFF" strokeWidth={2} />
              <Text style={styles.optionTitle}>自動バックアップ（推奨）</Text>
              <Text style={styles.optionDesc}>
                {Platform.OS === 'ios' ? 'iCloud' : 'Google Drive'}に自動保存
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* オプション2: 手動バックアップ */}
          <TouchableOpacity
            style={styles.optionButtonSecondary}
            onPress={handleManualBackup}
            disabled={isLoading}
          >
            <HardDrive size={28} color="#00F260" strokeWidth={2} />
            <Text style={styles.optionTitleSecondary}>手動バックアップ</Text>
            <Text style={styles.optionDescSecondary}>
              {Platform.OS === 'ios' ? '後で設定' : 'フォルダ選択'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* スキップボタン */}
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>後で設定する（非推奨）</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 65, 108, 0.1)',
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
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: 22,
  },
  optionsContainer: {
    width: '100%',
    gap: 16,
  },
  optionButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  optionGradient: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 8,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  optionDesc: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  optionButtonSecondary: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#00F260',
    gap: 8,
  },
  optionTitleSecondary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00F260',
  },
  optionDescSecondary: {
    fontSize: 13,
    color: '#94A3B8',
  },
  skipButton: {
    marginTop: 32,
    paddingVertical: 12,
  },
  skipText: {
    fontSize: 14,
    color: '#FF416C',
    fontWeight: '500',
  },
});
