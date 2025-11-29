import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { AlertTriangle, RefreshCw, CheckCircle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { checkDatabaseIntegrity, performAutoRecovery } from '@core/utils/dbIntegrityCheck';
import type { IntegrityCheckResult } from '@core/utils/dbIntegrityCheck';
import { colors } from '@core/theme/colors';

/**
 * recovery.tsx
 * 
 * データベース破損検知時の復旧UI
 * 起動時のIntegrityCheckで異常が見つかった場合、ここに誘導される
 * 
 * 機能:
 * - 検出されたエラー・警告の一覧表示
 * - クラウドバックアップからの自動復元ボタン
 * - 復元失敗時のマニュアルインポート案内
 */
export default function RecoveryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [integrity, setIntegrity] = useState<IntegrityCheckResult | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoverySuccess, setRecoverySuccess] = useState(false);

  useEffect(() => {
    // 画面表示時に再チェック
    (async () => {
      try {
        const result = await checkDatabaseIntegrity();
        setIntegrity(result);
      } catch (e) {
        console.error('Integrity check failed in recovery screen:', e);
      }
    })();
  }, []);

  const handleRecover = async () => {
    setIsRecovering(true);
    try {
      const result = await performAutoRecovery();
      if (result.success) {
        setRecoverySuccess(true);
        alert(result.message);
        // 復元成功後、/(tabs)/questへ
        setTimeout(() => {
          router.replace('/(tabs)/quest');
        }, 1500);
      } else {
        alert(`復元失敗: ${result.message}\n\n設定画面から手動インポートを試してください。`);
      }
    } catch (e: any) {
      alert(`復元エラー: ${e.message}`);
    } finally {
      setIsRecovering(false);
    }
  };

  const handleSkip = () => {
    if (
      confirm(
        '⚠️ データ破損を無視して続行しますか？\n\n学習履歴が不正確になり、アプリが正常動作しない可能性があります。'
      )
    ) {
      router.replace('/(tabs)/quest');
    }
  };

  return (
    <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: Math.max(60, insets.top + 40), paddingBottom: insets.bottom + 40 }]}
      >
        <View style={styles.iconContainer}>
          {recoverySuccess ? (
            <CheckCircle size={64} color="#00F260" strokeWidth={1.5} />
          ) : (
            <AlertTriangle size={64} color="#FF416C" strokeWidth={1.5} />
          )}
        </View>

        <Text style={styles.title}>
          {recoverySuccess ? 'データ復元完了！' : 'データ破損を検出'}
        </Text>
        <Text style={styles.description}>
          {recoverySuccess
            ? 'クラウドバックアップから正常に復元しました。'
            : 'データベースに異常が見つかりました。\nクラウドバックアップから復元を試みます。'}
        </Text>

        {integrity && !recoverySuccess && (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>検出されたエラー:</Text>
            {integrity.errors.length > 0 ? (
              integrity.errors.map((err, idx) => (
                <Text key={idx} style={styles.errorText}>
                  • {err}
                </Text>
              ))
            ) : (
              <Text style={styles.warningText}>エラーなし</Text>
            )}
            {integrity.warnings.length > 0 && (
              <>
                <Text style={[styles.errorTitle, { marginTop: 12 }]}>警告:</Text>
                {integrity.warnings.map((warn, idx) => (
                  <Text key={idx} style={styles.warningText}>
                    • {warn}
                  </Text>
                ))}
              </>
            )}
          </View>
        )}

        {!recoverySuccess && (
          <>
            <TouchableOpacity
              style={styles.recoverButton}
              onPress={handleRecover}
              disabled={isRecovering || !integrity?.canRestore}
            >
              <LinearGradient
                colors={integrity?.canRestore ? ['#00F260', '#0575E6'] : ['#475569', '#334155']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.recoverGradient}
              >
                {isRecovering ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <RefreshCw size={24} color="#FFFFFF" strokeWidth={2.5} />
                )}
                <Text style={styles.recoverText}>
                  {isRecovering ? '復元中...' : 'クラウドから復元'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {!integrity?.canRestore && (
              <Text style={styles.noBackupText}>
                復元可能なバックアップが見つかりません。{'\n'}
                設定画面から手動インポートを試してください。
              </Text>
            )}

            <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
              <Text style={styles.skipText}>無視して続行（非推奨）</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
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
    marginBottom: 32,
    lineHeight: 22,
  },
  errorBox: {
    width: '100%',
    backgroundColor: 'rgba(255, 65, 108, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF416C',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#FF416C',
    marginBottom: 4,
    lineHeight: 18,
  },
  warningText: {
    fontSize: 13,
    color: '#FBBF24',
    marginBottom: 4,
    lineHeight: 18,
  },
  recoverButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  recoverGradient: {
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  recoverText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  noBackupText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  skipButton: {
    marginTop: 16,
    paddingVertical: 12,
  },
  skipText: {
    fontSize: 14,
    color: '#FF416C',
    fontWeight: '500',
  },
});
