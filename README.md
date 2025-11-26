# 📱 Chiritsumo (チリツモ)

**脱・時間管理。成果主義のデジタル学習台帳**

Version: 7.1.0 (Local-First + Zero-Operation Cost)

## 🎯 コンセプト

学習時間（Duration）をKPIとせず、**成果（Lex）と速度（Velocity）** のみを管理指標とする、理系脳・ガチ勢のための自律分散学習プラットフォーム。

### コアバリュー

- **No Time Tracking**: 時間計測の完全廃止。学習の「質」と「量」のみを評価
- **Local First & Speed**: 全データを端末内DB（SQLite）に永続化。完全オフライン動作
- **The Trinity Modes**: 教材を「読む」「解く」「暗記」の3モードに分類
- **Visualized Roadmap**: 学習ルートを地下鉄路線図のようなグラフで可視化

## 🛠 Tech Stack

- **Runtime**: React Native (Expo SDK 54+)
- **Language**: TypeScript
- **Storage**: IndexedDB（Web） / SQLite（Native 予定）
- **ORM**: Drizzle ORM
- **State**: Zustand
- **Scheduling**: ts-fsrs（FSRS v5）
- **IAP**: react-native-purchases（RevenueCat）
- **Visualization/Share**: react-native-svg, react-native-view-shot

## 📦 主要機能

### ✅ 実装済み（Phase 1-3 完了 / v7.1.0）

#### データベース & コアロジック
- [x] IndexedDB（Web） + Drizzle ORM
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
- [x] 地下鉄路線図風のグラフ描画（マイルート）
- [x] ルートプリセット（厳選書籍の静的リンク集）
- [x] MainLine/Branch/Hub表示

#### データ管理（ゼロ運用コスト）
- [x] JSONバックアップ機能（Export/Import）
- [x] 設定画面（手動バックアップのみ）
- [x] クラウド連携・自動バックアップ削除（維持費ゼロ）

#### 課金システム
- [x] RevenueCat統合
- [x] Paywallスクリーン（買い切り¥3,600優先／年額¥1,500は補助表示）
- [x] Free Plan制限（Book 3冊まで）
- [x] Pro Plan判定ロジック
- [x] ストリーク維持（徳政令）機能

#### 分析/シェア
- [x] Brain Analytics Dashboard（忘却曲線・ヒートマップ）
- [x] Shareable Stats（SNS向け実績カード生成・共有）
- [x] 連続学習（ストリーク）算出・表示

#### 目標・報酬バランス（v7.1.0）
- [x] BASE_LEXを時間価値で統一（1分=10 Lex）
  - Read: 30 / Solve: 50 / Memo: 1
- [x] Lexプロファイルを時間ベースに再構築
  - 15分=150 / 1h=600 / 3h=1800 / 5h=3000（Pro） / 8h=4800（Pro）

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

### 本番環境への準備

#### 1. Web版の制限事項（重要）

**⚠️ Web版はネイティブ機能が制限されます:**
- `expo-file-system`：× ファイルシステムアクセスが制限される
- 自動/クラウドバックアップ：× 方針として非対応（手動のみ）

**推奨構成:**
- 本番リリース：**ネイティブアプリのみ配布**（iOS/Android）
- Web版：開発・テスト用途のみ

#### 2. バックアップ方針（ゼロ運用コスト）

本アプリは「手動バックアップ（JSON）」のみに対応します。OS標準の共有シートでエクスポート/インポートでき、壊れにくく維持費ゼロです。

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

## 🔐 運用ポリシー（ゼロ運用コスト）

- サーバーなし（完全ローカル）
- 外部API課金なし（IAPのみ）
- 認証/クラウドストレージ非対応（手動バックアップ）
- 維持コストゼロを最優先

## 💾 Backup（手動のみ）

- Settings画面から JSON形式でエクスポート/インポート可能
- 全データ（Books, Cards, Ledger）を含む完全バックアップ
- OS標準の共有シートを利用（壊れにくく、維持費ゼロ）

## 🗄️ Database Architecture

### Repository Pattern (統一インターフェース)

Web版（IndexedDB）とNative版（SQLite）の実装差異を吸収するため、Repository パターンを採用しています。

**インターフェース定義:**
```typescript
// app/core/database/IRepository.ts
interface IBooksRepository {
  getAll(): Promise<Book[]>;
  getById(id: string): Promise<Book | null>;
  add(book: Book): Promise<void>;
  update(id: string, updates: Partial<Book>): Promise<void>;
  delete(id: string): Promise<void>;
}
// ICardsRepository, ILedgerRepository, IPresetsRepository も同様
```

**実装の分離:**
- **Web版**: `db.web.ts` - IndexedDB実装（現行）
- **Native版**: `db.ts` - SQLite + Drizzle ORM実装（将来対応）

**利点:**
- スキーマ変更時、インターフェースを修正すればTypeScriptが実装漏れを検出
- テストコードでモックRepositoryを注入可能
- プラットフォーム間の挙動の違いを最小化

### Native Version (将来実装)

ネイティブ版でSQLiteを使用する場合、以下の設定が必須です：

**外部キー制約の有効化:**
```typescript
// app/core/database/sqlite.ts (将来実装時)
const db = SQLite.openDatabaseSync('chiritsumo.db');
db.execSync('PRAGMA foreign_keys = ON;');
```

これにより、`books`テーブルの削除時に関連する`cards`が自動的にCASCADE削除されます。
設定しない場合、削除されたBookに紐づくCardがゴミデータとして残る可能性があります。

### Web Version (現行)

- **Database**: IndexedDB
- **Migration**: localStorage → IndexedDB（自動）
- **Storage Limit**: 5MB制限を回避（IndexedDBは実質無制限）
- **Note**: IndexedDBには外部キー制約がないため、削除処理は明示的に実装済み

## 🎨 デザインシステム: "Aurora Glass"

- **Theme**: Dark Mode Only (Deep Space Black)
- **Visual**: すりガラス（Blur）と発光（Neon Gradient）
- **Colors**:
  - Pass/Gain: Aurora Green (#00F260)
  - Fail/Debt: Plasma Red (#FF416C)
  - Route/Link: Electric Blue (#2980B9)

## 🧠 使い方のヒント（v7.1.0）

- 日次Lex目標は時間で考える（例: 1800 Lex ≒ 3時間）
- Solve/Read/Memoのどれを選んでも、時間あたりの報酬は公平（1分=10 Lex）
- 少しずつ貯金して、Time Freeze（休暇）を買うのがおすすめ
- 実績カードを定期的にSNSでシェアして、習慣化とモチベ維持

## 📄 ライセンス

All rights reserved.

## 📧 Contact

Email: privacy@chiritsumo.app

---

**Built with ❤️ for serious learners**

