/**
 * プライバシーポリシー画面（アプリ内組み込み）
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { colors } from '@core/theme/colors';

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <LinearGradient colors={[colors.background, colors.backgroundDark]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>プライバシーポリシー</Text>
          <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
            <X color={colors.text} size={24} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          <Text style={styles.updateDate}>最終更新日: 2025年11月27日</Text>

          <Text style={styles.sectionTitle}>1. はじめに</Text>
          <Text style={styles.paragraph}>
            Chiritsumo（チリツモ）（以下「本アプリ」）は、ユーザーのプライバシーを尊重し、個人情報の保護に最大限の注意を払います。
            本プライバシーポリシーは、本アプリがどのようにユーザーの情報を収集、使用、保護するかを説明するものです。
          </Text>

          <Text style={styles.sectionTitle}>2. 収集する情報</Text>
          
          <Text style={styles.subsectionTitle}>2.1 Local First アーキテクチャ</Text>
          <Text style={styles.paragraph}>
            本アプリは「Local First」設計を採用しており、<Text style={styles.bold}>学習データ（参考書情報、カード復習履歴、学習実績など）は全て端末内のデータベース（Web: IndexedDB / Native: SQLite）に保存され、外部サーバーへは送信されません。</Text>
          </Text>

          <Text style={styles.subsectionTitle}>2.2 カメラ権限</Text>
          <Text style={styles.paragraph}>
            本アプリは、学習カードの復習時に間違えた問題の写真メモを撮影する機能を提供しています。
            カメラ権限は、ユーザーが明示的に写真撮影機能を使用する場合にのみ要求されます。
            撮影された写真は端末内にのみ保存され、外部へ送信されることはありません。
          </Text>

          <Text style={styles.subsectionTitle}>2.3 課金情報</Text>
          <Text style={styles.paragraph}>
            Pro Plan購入時の決済情報は、Apple App Store / Google Play StoreおよびRevenueCatによって管理されます。開発者が直接クレジットカード情報などを取得・保存することはありません。
          </Text>

          <Text style={styles.sectionTitle}>3. 情報の利用目的</Text>
          <Text style={styles.listItem}>• 学習履歴の記録と表示（端末内のみ）</Text>
          <Text style={styles.listItem}>• 学習分析AI（FSRS v5）による復習スケジュールの最適化（端末内のみ）</Text>
          <Text style={styles.listItem}>• 課金サービスの提供（RevenueCatを経由）</Text>

          <Text style={styles.sectionTitle}>4. 第三者への情報提供</Text>
          <Text style={styles.paragraph}>
            本アプリは、以下の場合を除き、ユーザーの個人情報を第三者に提供することはありません。
          </Text>
          <Text style={styles.listItem}>• ユーザーの同意がある場合</Text>
          <Text style={styles.listItem}>• 法令に基づく場合</Text>
          <Text style={styles.listItem}>• 課金処理のために必要な範囲でRevenueCatに提供される場合</Text>

          <Text style={styles.sectionTitle}>5. データのバックアップ</Text>
          <Text style={styles.paragraph}>
            本アプリでは、ユーザーが手動でJSON形式のバックアップをエクスポート/インポートできます。自動・クラウド連携によるバックアップ機能は提供していません。
            エクスポートされたファイルは、ユーザーがGoogle DriveやiCloud等の任意のストレージサービスに<Text style={styles.bold}>手動で</Text>保存することができますが、
            開発者がそれらのファイルへアクセスすることはありません（外部依存なし、維持費ゼロの方針）。
          </Text>

          <Text style={styles.sectionTitle}>6. データの削除</Text>
          <Text style={styles.paragraph}>
            本アプリをアンインストールすることで、端末内の全ての学習データは削除されます。
            また、設定画面からいつでも全データを削除することが可能です。
          </Text>

          <Text style={styles.sectionTitle}>7. セキュリティ</Text>
          <Text style={styles.paragraph}>
            本アプリは、端末内のSQLiteデータベースにデータを保存しており、OSレベルのサンドボックスによって保護されています。
            他のアプリケーションがこれらのデータにアクセスすることはできません。
          </Text>

          <Text style={styles.sectionTitle}>8. お問い合わせ</Text>
          <Text style={styles.paragraph}>
            本プライバシーポリシーに関するご質問は、アプリ内の「設定」→「お問い合わせ」からお願いいたします。
          </Text>

          <Text style={styles.sectionTitle}>9. 変更について</Text>
          <Text style={styles.paragraph}>
            本プライバシーポリシーは、必要に応じて変更されることがあります。
            変更後のポリシーは、アプリのアップデート時に通知され、本画面で確認できます。
          </Text>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  updateDate: {
    fontSize: 12,
    color: colors.textTertiary,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 24,
    marginBottom: 12,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 24,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  bold: {
    fontWeight: '700',
    color: colors.text,
  },
  listItem: {
    fontSize: 14,
    lineHeight: 24,
    color: colors.textSecondary,
    marginBottom: 8,
    paddingLeft: 8,
  },
});
