import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Share2, Sparkles, TrendingUp, Flame } from 'lucide-react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { colors } from '@core/theme/colors';
import { glassEffect } from '@core/theme/glassEffect';

interface ShareableStatsProps {
  todayLex: number;
  currentStreak: number;
  totalBooks: number;
  completionRate: number;
}

export const ShareableStats: React.FC<ShareableStatsProps> = ({
  todayLex,
  currentStreak,
  totalBooks,
  completionRate,
}) => {
  const viewRef = useRef<View>(null);

  const handleShare = async () => {
    if (!viewRef.current) return;

    try {
      // Viewを画像としてキャプチャ
      const uri = await captureRef(viewRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });

      // シェア可能かチェック
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('エラー', 'この端末ではシェア機能を利用できません');
        return;
      }

      // シェア実行
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: '今日の学習実績をシェア',
      });
    } catch (error) {
      console.error('Share failed:', error);
      Alert.alert('エラー', 'シェアに失敗しました');
    }
  };

  return (
    <View style={styles.container}>
      {/* シェアボタン */}
      <TouchableOpacity
        style={[glassEffect.card, styles.shareButton]}
        onPress={handleShare}
      >
        <Share2 color={colors.primary} size={20} strokeWidth={2} />
        <Text style={styles.shareButtonText}>今日の実績をシェア</Text>
      </TouchableOpacity>

      {/* シェア用画像（非表示だが画面外でレンダリング） */}
      <View style={styles.hiddenContainer}>
        <View ref={viewRef} collapsable={false}>
          <LinearGradient
            colors={['#1a1a2e', '#16213e', '#0f3460']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.shareCard}
          >
            {/* ヘッダー */}
            <View style={styles.shareHeader}>
              <Sparkles color="#00d4ff" size={32} strokeWidth={2.5} />
              <Text style={styles.shareAppName}>Chiritsumo</Text>
            </View>

            {/* メイン指標 */}
            <View style={styles.mainStat}>
              <Text style={styles.mainStatLabel}>Today's Progress</Text>
              <Text style={styles.mainStatValue}>{todayLex}</Text>
              <Text style={styles.mainStatUnit}>Lex獲得</Text>
              <Text style={styles.mainStatHint}>約{Math.round(todayLex / 10)}分</Text>
            </View>

            {/* サブ指標 */}
            <View style={styles.subStats}>
              <View style={styles.subStatItem}>
                <Flame color="#ff6b6b" size={24} strokeWidth={2} />
                <Text style={styles.subStatValue}>{currentStreak}</Text>
                <Text style={styles.subStatLabel}>日連続</Text>
              </View>

              <View style={styles.subStatDivider} />

              <View style={styles.subStatItem}>
                <TrendingUp color="#4ecdc4" size={24} strokeWidth={2} />
                <Text style={styles.subStatValue}>{completionRate}%</Text>
                <Text style={styles.subStatLabel}>達成率</Text>
              </View>

              <View style={styles.subStatDivider} />

              <View style={styles.subStatItem}>
                <Text style={styles.subStatEmoji}>📚</Text>
                <Text style={styles.subStatValue}>{totalBooks}</Text>
                <Text style={styles.subStatLabel}>進行中</Text>
              </View>
            </View>

            {/* フッター */}
            <View style={styles.shareFooter}>
              <Text style={styles.shareFooterText}>積み上げ学習アプリ</Text>
              <Text style={styles.shareFooterUrl}>chiritsumo.app</Text>
            </View>

            {/* 装飾 */}
            <View style={styles.decorationTop} />
            <View style={styles.decorationBottom} />
          </LinearGradient>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  shareButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  hiddenContainer: {
    position: 'absolute',
    left: -9999,
    top: -9999,
  },
  shareCard: {
    width: 400,
    height: 600,
    padding: 40,
    borderRadius: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  shareHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 60,
  },
  shareAppName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 1,
  },
  mainStat: {
    alignItems: 'center',
    marginBottom: 60,
  },
  mainStatLabel: {
    fontSize: 16,
    color: '#94a3b8',
    marginBottom: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  mainStatValue: {
    fontSize: 96,
    fontWeight: '900',
    color: '#00d4ff',
    marginBottom: 8,
  },
  mainStatUnit: {
    fontSize: 20,
    color: '#cbd5e1',
    fontWeight: '600',
  },
  mainStatHint: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 6,
  },
  subStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 60,
  },
  subStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  subStatEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  subStatValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 8,
    marginBottom: 4,
  },
  subStatLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  subStatDivider: {
    width: 1,
    height: 60,
    backgroundColor: '#334155',
  },
  shareFooter: {
    alignItems: 'center',
    marginTop: 'auto',
  },
  shareFooterText: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 4,
  },
  shareFooterUrl: {
    fontSize: 18,
    fontWeight: '700',
    color: '#00d4ff',
    letterSpacing: 1,
  },
  decorationTop: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#00d4ff',
    opacity: 0.1,
  },
  decorationBottom: {
    position: 'absolute',
    bottom: -150,
    left: -150,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: '#ff6b6b',
    opacity: 0.08,
  },
});
