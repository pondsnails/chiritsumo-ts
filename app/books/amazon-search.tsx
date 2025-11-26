/**
 * Amazon教材検索画面（WebView + 自動アフィリエイト注入）
 * ユーザーがAmazonで教材を検索・購入する際、自動的にアフィリエイトタグを付与
 */

import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Search, Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/app/core/theme/colors';
import { glassEffect } from '@/app/core/theme/glassEffect';

// ★ あなたのAmazonアソシエイトIDをここに設定
const AFFILIATE_TAG = 'YOUR_AFFILIATE_ID';

export default function AmazonSearchScreen() {
  const router = useRouter();
  const webViewRef = useRef<WebView>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUrl, setCurrentUrl] = useState('');
  const [canGoBack, setCanGoBack] = useState(false);

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    
    // Amazon検索URLを構築（初めからアフィリエイトタグ付き）
    const searchUrl = `https://www.amazon.co.jp/s?k=${encodeURIComponent(searchQuery)}&tag=${AFFILIATE_TAG}`;
    webViewRef.current?.injectJavaScript(`window.location.href = "${searchUrl}";`);
  };

  // URLにアフィリエイトタグを自動注入するスクリプト
  const affiliateInjectionScript = `
    (function() {
      const affiliateTag = '${AFFILIATE_TAG}';
      
      // 全てのAmazonリンクにアフィリエイトタグを追加
      function addAffiliateTag() {
        const links = document.querySelectorAll('a[href*="amazon.co.jp"]');
        links.forEach(link => {
          try {
            const url = new URL(link.href);
            // 既にtagパラメータがある場合は置き換え
            url.searchParams.set('tag', affiliateTag);
            link.href = url.toString();
          } catch (e) {
            // URLパースエラーは無視
          }
        });
      }
      
      // 初回実行
      addAffiliateTag();
      
      // DOM変更を監視して動的に追加されるリンクにも対応
      const observer = new MutationObserver(addAffiliateTag);
      observer.observe(document.body, { childList: true, subtree: true });
      
      // ページ遷移時も実行
      window.addEventListener('load', addAffiliateTag);
    })();
    true; // Must return true for Android
  `;

  const handleNavigationStateChange = (navState: any) => {
    setCurrentUrl(navState.url);
    setCanGoBack(navState.canGoBack);
  };

  const handleAddToLibrary = () => {
    Alert.alert(
      '書籍をインポート',
      'この機能はPro版で利用可能です。\n\n商品ページのURL、タイトル、画像を自動的に取得してライブラリに追加できます。',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: 'Pro版を見る', onPress: () => router.push('/(tabs)/settings') },
      ]
    );
  };

  return (
    <LinearGradient colors={[colors.background, colors.backgroundDark]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => canGoBack ? webViewRef.current?.goBack() : router.back()}
          >
            <ArrowLeft color={colors.text} size={24} />
          </TouchableOpacity>
          
          <View style={[glassEffect.card, styles.searchBar]}>
            <Search color={colors.textSecondary} size={20} />
            <TextInput
              style={styles.searchInput}
              placeholder="教材を検索（参考書、問題集など）"
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
          </View>

          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddToLibrary}
          >
            <Plus color={colors.primary} size={24} />
          </TouchableOpacity>
        </View>

        {/* WebView */}
        <WebView
          ref={webViewRef}
          source={{ uri: 'https://www.amazon.co.jp' }}
          style={styles.webView}
          injectedJavaScript={affiliateInjectionScript}
          onNavigationStateChange={handleNavigationStateChange}
          onMessage={(event) => {
            // 必要に応じてWebViewからのメッセージを処理
          }}
          // リンククリック時にもスクリプトを再実行
          onLoadEnd={() => {
            webViewRef.current?.injectJavaScript(affiliateInjectionScript);
          }}
        />

        {/* URLバー（デバッグ用、本番では非表示推奨） */}
        {__DEV__ && currentUrl && (
          <View style={styles.urlBar}>
            <Text style={styles.urlText} numberOfLines={1}>
              {currentUrl}
            </Text>
          </View>
        )}
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
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  addButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary + '20',
    borderRadius: 20,
  },
  webView: {
    flex: 1,
  },
  urlBar: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
  },
  urlText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
