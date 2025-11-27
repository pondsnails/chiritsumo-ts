# 🚀 リリース前チェックリスト

**Version: 7.1.0**  
**Last Updated: 2025-11-28**

---

## ⛔ 致命的ブロッカー（修正必須）

### 1. RevenueCat APIキー設定

- [ ] **RevenueCatダッシュボードでプロジェクト作成**
  - URL: https://app.revenuecat.com/
  - iOS用プロジェクト作成（Bundle ID: `com.chiritsumo.app`）
  - Android用プロジェクト作成（Package: `com.chiritsumo.app`）

- [ ] **APIキー取得**
  - iOS用APIキー（`appl_xxxxxxxxx` 形式）
  - Android用APIキー（`goog_xxxxxxxxx` 形式）

- [ ] **環境変数ファイル作成**
  ```bash
  # .env.example を .env にコピー
  cp .env.example .env
  
  # .env にAPIキーを記入（下記参照）
  ```

- [ ] **.env ファイル編集**
  ```bash
  EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_YOUR_ACTUAL_IOS_KEY
  EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_YOUR_ACTUAL_ANDROID_KEY
  EXPO_PUBLIC_DEV_FORCE_PRO=false
  ```

- [ ] **Entitlement設定確認**
  - RevenueCatダッシュボードで Entitlement ID `pro` を作成
  - iOS/Android のサブスクリプション商品をEntitlementに紐付け
  - 商品ID:
    - 年額: `com.chiritsumo.yearly` (¥1,500)
    - 買い切り: `com.chiritsumo.lifetime` (¥3,600 推奨)

---

### 2. プライバシーポリシーのホスティング

- [ ] **HTMLファイルのデプロイ**
  - `app/privacy-policy.tsx` の内容をHTMLとして抽出
  - GitHub Pages / Netlify / Vercel にデプロイ
  - URL例: `https://pondsnails.github.io/chiritsumo-privacy/`

- [ ] **アプリ内リンクの更新**
  - ファイル: `app/(tabs)/settings.tsx` (Line 579)
  - 変更前: `router.push('/privacy-policy' as any)`
  - 変更後: `await WebBrowser.openBrowserAsync('https://your-domain.com/privacy-policy.html')`

- [ ] **ストア申請時の登録**
  - App Store Connect: App Privacy設定でプライバシーポリシーURL記入
  - Google Play Console: ストアの掲載情報でプライバシーポリシーURL記入

---

### 3. 実機ビルド & テスト

#### iOS (TestFlight)

- [ ] **開発者アカウント確認**
  - Apple Developer Program登録（年額$99）
  - App Store Connect でアプリ作成

- [ ] **EAS Buildでビルド**
  ```bash
  # iOS実機ビルド（Testflight配布用）
  eas build --platform ios --profile production
  
  # ビルド完了後、自動的にApp Store Connectにアップロード
  ```

- [ ] **TestFlightで配布**
  - App Store Connect でビルドをTestFlightに追加
  - 内部テスター（自分）を招待

- [ ] **実機で動作確認**
  - [ ] アプリ起動・オンボーディング完了
  - [ ] 書籍追加（OpenBD/Google Books API動作確認）
  - [ ] カード学習（Read/Solve/Memo）
  - [ ] Bank機能（Rollover/破産警告）
  - [ ] Route表示（Metro路線図）
  - [ ] Brain Analytics（グラフ描画）
  - [ ] Shareable Stats（画像生成・共有）

- [ ] **課金フローテスト（Sandbox）**
  - [ ] Settings → Paywall遷移
  - [ ] 年額プラン購入テスト（Sandbox環境）
  - [ ] 購入後 `isProUser = true` になることを確認
  - [ ] Pro限定機能解放確認（Book 4冊目追加可能、Chunk Size上限開放）

#### Android (Internal Testing)

- [ ] **Google Play Console準備**
  - Google Play Developer登録（初回$25）
  - アプリ作成（Package: `com.chiritsumo.app`）

- [ ] **EAS Buildでビルド**
  ```bash
  # Android実機ビルド（内部テスト用）
  eas build --platform android --profile production
  ```

- [ ] **Internal Testingで配布**
  - Play Console で内部テスト版としてアップロード
  - テスターリストに自分を追加

- [ ] **実機で動作確認（iOS同様の項目）**

---

### 4. データバックアップのテスト

⚠️ **Zero-Operation Cost方針により、クラウド自動バックアップはなし（手動のみ）**

- [ ] **大量データでテスト**
  - Book 10冊以上作成
  - Card 500枚以上作成
  - Ledger履歴 100件以上蓄積

- [ ] **エクスポート → インポート完全復元確認**
  1. Settings → データバックアップ → JSONエクスポート
  2. ファイルが正常に作成されたことを確認
  3. アプリをアンインストール
  4. 再インストール
  5. Settings → データバックアップ → JSONインポート
  6. 全データが完全復元されることを確認

- [ ] **エラーハンドリング確認**
  - [ ] 不正なJSONファイルをインポート → エラーメッセージ表示
  - [ ] 古いバージョンのバックアップファイルをインポート → マイグレーション動作

---

## ⚠️ 機能・UX面での懸念対応

### バックアップ周知の強化

- [ ] **オンボーディング画面に警告追加**
  - ファイル: `app/onboarding.tsx`
  - 追加内容: 「このアプリはサーバーにデータを保存していません。機種変更時は必ず手動でエクスポートしてください」

- [ ] **Settings画面の注意喚起強化**
  - ファイル: `app/(tabs)/settings.tsx`
  - 既存の警告文を**赤文字・太字**で目立たせる

- [ ] **定期的なバックアップリマインダー（オプション）**
  - 30日間バックアップなしの場合、アプリ起動時に通知
  - 実装は任意（Phase 4以降）

### Amazonアフィリエイトリンク動作確認

- [ ] **実機でAmazon検索リンクテスト**
  - Route画面 → 書籍推薦 → Amazon検索リンク
  - iOS Safari / Android Chrome で正常に開くか確認
  - Amazonアプリインストール済み端末でディープリンク動作確認

- [ ] **アフィリエイトタグの検証**
  - リンク先URLに `tag=chiritsumo-22` が含まれているか確認
  - （オプション）Amazon アソシエイトでクリック数計測

---

## 📱 ストア素材準備

### App Store (iOS)

- [ ] **スクリーンショット撮影**
  - iPhone 15 Pro Max（6.7インチ）必須
  - iPhone 8 Plus（5.5インチ）推奨
  - 必要枚数: 各サイズ 3〜10枚
  - 推奨画面:
    1. Metro路線図（Route画面）
    2. Brain Analytics（グラフ）
    3. Shareable Stats（実績カード）
    4. Bank画面（Lex残高）
    5. 学習画面（復習カード）

- [ ] **アプリアイコン（1024×1024）**
  - ファイル: `assets/images/icon.png`
  - 既存アイコンを確認（角丸なし、背景透過なし）

- [ ] **アプリ説明文作成**
  - タイトル: Chiritsumo（30文字以内）
  - サブタイトル: 成果主義のデジタル学習台帳（30文字以内）
  - 説明文: README.mdの「コンセプト」を流用

- [ ] **キーワード設定**
  - 例: FSRS,間隔反復,学習管理,暗記アプリ,資格試験,読書記録

### Google Play (Android)

- [ ] **スクリーンショット**
  - 最小解像度: 320px
  - 最大解像度: 3840px
  - 必要枚数: 2〜8枚（iOS同様のもの流用可）

- [ ] **フィーチャーグラフィック**
  - サイズ: 1024×500
  - Canvaなどで作成（路線図をメインビジュアルに）

---

## 🔐 セキュリティ・プライバシー

- [ ] **個人情報収集ゼロを明記**
  - App Store Privacy設定: 「データを収集しない」を選択
  - Google Play: Data safety section で「データ収集なし」を明記

- [ ] **権限の正当性説明**
  - カメラ権限: 学習メモ撮影用（既に `app.json` に記載済み）
  - ストレージ権限: JSONバックアップ保存用

---

## 🎯 最終確認項目

- [ ] **バージョン番号確認**
  - `app.json` の `version` が `7.1.0` または適切なバージョン
  - `package.json` と一致しているか

- [ ] **app.json の最終チェック**
  - [ ] `name`: アプリ名確認
  - [ ] `bundleIdentifier` / `package`: 本番用に設定済み
  - [ ] `icon`: アイコンファイルが存在するか確認
  - [ ] `permissions`: 不要な権限が含まれていないか

- [ ] **TypeScriptビルドエラーゼロ**
  ```bash
  npx tsc --noEmit
  ```

- [ ] **Lintエラー解消**
  ```bash
  npm run lint
  ```

- [ ] **依存関係の脆弱性チェック**
  ```bash
  npm audit
  ```

---

## 📤 ストア申請

### iOS App Store

1. EAS Buildでproductionビルド
   ```bash
   eas build --platform ios --profile production
   ```

2. App Store Connect で審査提出
   - ビルド選択
   - スクリーンショット/説明文登録
   - 価格設定（無料 + App内課金）
   - 審査用メモ: 「テストアカウント不要、課金はSandboxで確認可能」

3. 審査待ち（通常1〜3日）

### Android Google Play

1. EAS Buildでproductionビルド
   ```bash
   eas build --platform android --profile production
   ```

2. Play Consoleで本番トラックにアップロード
   - リリース作成
   - ストアの掲載情報入力
   - コンテンツレーティング（IARC）取得
   - 審査提出

3. 審査待ち（通常1〜7日）

---

## ✅ リリース判定

以下の項目が**すべて完了**したらリリース可能:

- [ ] RevenueCat APIキー設定完了（本番環境）
- [ ] 実機で課金フローテスト完了（Sandbox）
- [ ] バックアップ復元テスト完了（大量データ）
- [ ] プライバシーポリシーURL公開済み
- [ ] スクリーンショット・説明文準備完了
- [ ] TypeScript/Lint/Auditエラーゼロ

**これらをクリアすれば、自信を持ってリリースできるレベルのアプリです。**

---

## 📞 トラブルシューティング

### Q. RevenueCatの初期化でエラーが出る

```typescript
// subscriptionStore.ts で確認
if (apiKey.startsWith('YOUR_')) {
  console.warn('RevenueCat API key not configured');
  // このメッセージが出る場合は .env の設定を確認
}
```

### Q. バックアップが復元できない

- JSONファイルの形式が正しいか確認（`backupService.ts` のバリデーション）
- 古いバージョンのバックアップの場合、マイグレーション関数が実行されるか確認

### Q. 実機で「アプリが開けない」エラー

- Expo Go では動作しません（Native Modules使用のため）
- EAS Build で作成したバイナリをインストールしてください

---

**Good Luck! 🚀**
