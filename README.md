# 📱 Chiritsumo (チリツモ)

**脱・時間管理。成果主義のデジタル学習台帳**

Version: 7.0.0 (Local-First Definitive Edition)

## 🎯 コンセプト

学習時間（Duration）をKPIとせず、**成果（Lex）と速度（Velocity）** のみを管理指標とする、理系脳・ガチ勢のための自律分散学習プラットフォーム。

### コアバリュー

- **No Time Tracking**: 時間計測の完全廃止。学習の「質」と「量」のみを評価
- **Local First & Speed**: 全データを端末内DB（SQLite）に永続化。完全オフライン動作
- **The Trinity Modes**: 教材を「読む」「解く」「暗記」の3モードに分類
- **Visualized Roadmap**: 学習ルートを地下鉄路線図のようなグラフで可視化

## 🛠 Tech Stack

- **Runtime**: React Native (Expo SDK 52+)
- **Language**: TypeScript
- **Database**: expo-sqlite (SQLite)
- **ORM**: Drizzle ORM
- **State**: Zustand
- **Algorithm**: ts-fsrs (FSRS v5)
- **IAP**: react-native-purchases (RevenueCat)
- **AI**: Google Gemini API

## 📦 主要機能

### ✅ 実装済み（Phase 1-3）

#### データベース & コアロジック
- [x] SQLite + Drizzle ORM環境構築
- [x] Books/Cards/Ledgerスキーマ定義
- [x] Chunking機能（1カードあたりの学習量指定）
- [x] 循環参照防止（DAGグラフ管理）
- [x] FSRS v5アルゴリズム統合

#### 学習機能
- [x] Read/Solve/Memoの3モード対応
- [x] モード別Retention設定（0.85/0.90/0.80）
- [x] Memoモード一括検品UI
- [x] 写真メモ機能（失敗時の記録）

#### Bank機能
- [x] 日次Rollover処理
- [x] Lex残高管理
- [x] Time Freeze（有給休暇）購入機能
- [x] ブラックマーケット（カード売却）

#### Route（路線図）
- [x] 地下鉄路線図風のグラフ描画
- [x] MainLine/Branch表示
- [x] Hub表示（多数の子書籍）

#### データ管理
- [x] JSONバックアップ機能（Export/Import）
- [x] 設定画面
- [x] 手動バックアップ対応

#### 課金システム
- [x] RevenueCat統合
- [x] Paywallスクリーン
- [x] Free Plan制限（Book 3冊まで）
- [x] Pro Plan判定ロジック
- [x] ストリーク維持（徳政令）機能

#### ストア対応
- [x] app.jsonにカメラ権限説明追加
- [x] プライバシーポリシーHTML作成
- [x] iOS/Android権限設定

## 🚀 Getting Started

### 前提条件

```bash
node >= 18.x
npm >= 9.x
```

### インストール

```bash
# パッケージインストール
npm install

# 開発サーバー起動
npm run dev
```

### RevenueCat設定（本番環境）

1. `app/core/store/subscriptionStore.ts` のAPI Keyを設定
```typescript
const REVENUECAT_API_KEY_IOS = 'your_ios_api_key';
const REVENUECAT_API_KEY_ANDROID = 'your_android_api_key';
```

2. RevenueCatダッシュボードでEntitlement IDを設定
   - 推奨: `pro` または `premium`

### プライバシーポリシーのホスティング

`privacy-policy.html` をGitHub PagesやNetlifyにデプロイし、`app/(tabs)/settings.tsx` のURLを更新してください。

```typescript
await WebBrowser.openBrowserAsync('https://your-domain.com/privacy-policy.html');
```

## 📁 プロジェクト構造

```
app/
├── (tabs)/              # タブナビゲーション
│   ├── quest.tsx        # 学習クエスト画面
│   ├── route.tsx        # 路線図画面
│   ├── bank.tsx         # 読書銀行画面
│   ├── books.tsx        # 書籍一覧
│   └── settings.tsx     # 設定画面（NEW）
├── books/
│   ├── add.tsx          # 書籍追加（制限チェック実装）
│   └── edit.tsx         # 書籍編集
├── core/
│   ├── components/      # 再利用可能なコンポーネント
│   ├── database/        # Drizzle ORM & SQLite
│   ├── fsrs/            # FSRS v5スケジューラ
│   ├── layout/          # 路線図レイアウトエンジン
│   ├── logic/           # ビジネスロジック
│   ├── services/
│   │   ├── BookService.ts
│   │   ├── backupService.ts  # バックアップ（NEW）
│   │   └── aiAffiliate.ts
│   ├── store/
│   │   ├── bookStore.ts
│   │   ├── cardStore.ts
│   │   └── subscriptionStore.ts  # 課金管理（NEW）
│   ├── theme/           # カラー・グラスエフェクト
│   ├── types/           # 型定義
│   └── utils/           # ユーティリティ
├── paywall.tsx          # Paywallスクリーン（NEW）
├── study.tsx            # Read/Solve学習画面
└── study-memo.tsx       # Memo一括学習画面
```

## 📋 リリース前チェックリスト

### Phase 4: Release Preparation

- [ ] **実機テスト（iOS）**
  - [ ] Book登録制限の動作確認
  - [ ] カメラ権限の動作確認
  - [ ] バックアップExport/Importテスト
  - [ ] RevenueCat課金フローテスト

- [ ] **実機テスト（Android）**
  - [ ] 同上

- [ ] **ストア素材準備**
  - [ ] アイコン（1024x1024）
  - [ ] スクリーンショット（各画面）
  - [ ] アプリ説明文（日本語/英語）
  - [ ] キーワード設定

- [ ] **RevenueCat本番設定**
  - [ ] iOS App Store Connect連携
  - [ ] Google Play Console連携
  - [ ] Entitlement設定
  - [ ] API Key差し替え

- [ ] **Gemini API セキュリティ設定**
  - [ ] Google Cloud Console > APIs & Services > Credentials
  - [ ] API制限を「Android apps」「iOS apps」に設定
  - [ ] Bundle ID: `com.chiritsumo.app` を登録
  - [ ] SHA-1フィンガープリントを登録
  - [ ] (参考: https://cloud.google.com/docs/authentication/api-keys)

- [ ] **プライバシーポリシーホスティング**
  - [ ] HTMLをデプロイ
  - [ ] URLをアプリに反映

- [ ] **審査提出**
  - [ ] App Store Connect
  - [ ] Google Play Console

## 🔐 Security Best Practices

### API Key Protection

**Gemini API Key制限設定（必須）**

1. Google Cloud Consoleにアクセス
2. 「APIs & Services」→「認証情報」
3. 使用中のAPI Keyを編集
4. 「アプリケーションの制限」セクション：
   - ✅ 「Android apps」または「iOS apps」を選択
   - ❌ 「なし」は選択しない（セキュリティリスク）
5. **iOS apps**の場合：
   - Bundle ID: `com.chiritsumo.app` を追加
6. **Android apps**の場合：
   - Package name: `com.chiritsumo.app`
   - SHA-1フィンガープリント: （keystoreから取得）
7. 「保存」

これにより、APIキーがアプリから抽出されても、他のアプリやWebサイトから不正利用されることを防げます。

### Environment Variables Setup

`.env` ファイルを作成（`.gitignore`に含める）:

```env
EXPO_PUBLIC_GEMINI_API_KEY=your_api_key_here
```

または `app.json` の `extra` セクション:

```json
{
  "expo": {
    "extra": {
      "geminiApiKey": "your_api_key_here"
    }
  }
}
```

⚠️ **注意**: APIキーはGitにコミットしないでください！

## 🎨 デザインシステム: "Aurora Glass"

- **Theme**: Dark Mode Only (Deep Space Black)
- **Visual**: すりガラス（Blur）と発光（Neon Gradient）
- **Colors**:
  - Pass/Gain: Aurora Green (#00F260)
  - Fail/Debt: Plasma Red (#FF416C)
  - Route/Link: Electric Blue (#2980B9)

## 📄 ライセンス

All rights reserved.

## 📧 Contact

Email: privacy@chiritsumo.app

---

**Built with ❤️ for serious learners**

