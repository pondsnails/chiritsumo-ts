# 📱 Chiritsumo (チリツモ)

**脱・時間管理。成果主義のデジタル学習台帳**

Version: 7.2.2 (Local-First + Zero-Operation Cost + Cloud Sync + Preset Routes)

## 🎯 コンセプト

学習時間（Duration）をKPIとせず、**成果（Lex）と速度（Velocity）** のみを管理指標とする、理系脳・ガチ勢のための自律分散学習プラットフォーム。

### コアバリュー

- **No Time Tracking**: 時間計測の完全廃止。学習の「質」と「量」のみを評価
- **Local First & Speed**: 全データを端末内DB（SQLite）に永続化。完全オフライン動作

- **Runtime**: React Native (Expo SDK 54+)
- **Language**: TypeScript

### ✅ 実装済み（Phase 1-6 完了 / v7.2.2）

#### データベース & コアロジック
- [x] **SQLite (Drizzle ORM)** - Web版廃止、Native専用に統一
- [x] **Repository Pattern移行完了** - Books/Cards/Ledger/InventoryPresetsをDrizzle化
- [x] **Zod Schema Adapters** - DB正規化・バリデーション統一レイヤー追加
- [x] Read/Solve/Memoの3モード対応
- [x] モード別Retention設定（0.85/0.90/0.80）
- [x] 日次Rollover処理
- [x] Lex残高管理
- [x] 地下鉄路線図風のグラフ描画（マイルート）
- [x] **Metroレイアウト非同期キャッシュ** - UI blocking回避、高速レンダリング
- [x] **プリセットルート展開システム** - TOEIC/簿記/基本情報/React入門の4ルート実装
- [x] JSONバックアップ機能（Export/Import）
- [x] **自動バックアップ（iOS/Android）** - Google Console不要、OS標準API活用
- [x] 設定画面（手動バックアップのみ）
- [x] RevenueCat統合
- [x] Paywallスクリーン（買い切り¥3,600優先／年額¥1,500は補助表示）
- [x] Brain Analytics Dashboard（忘却曲線・ヒートマップ）
- [x] Shareable Stats（SNS向け実績カード生成・共有）
- [x] BASE_LEXを時間価値で統一（1分=10 Lex）
  - Read: 30 / Solve: 50 / Memo: 1
  - 15分=150 / 1h=600 / 3h=1800 / 5h=3000（Pro） / 8h=4800（Pro）

#### 受験生メンタル支柱機能（v7.1.0新規）
- [x] **合格ナビ（Exam GPS）** - 目標日 vs 予測完了日を表示、速度不足時に具体的アドバイス
- [x] **リベンジモード演出** - 借金を「ボーナスゾーン」に再定義、🔥アイコン + 倍率表示
- [x] **用語ポジティブ化** - ネガティブ用語を励まし言葉に全面変換
- [x] **絶対的ネクストアクション最大化** - 巨大アクションボタン、詳細デフォルト非表示で決断疲れ排除
- [x] **積み上げタワー可視化** - 累計XPを物理的高さ（cm/m）に変換、承認欲求・孤独感を充足

#### UX最適化・データ保護（v7.2.0新規）
- [x] **自動バックアップ（iOS/Android）** - アプリ起動・復帰時に自動でバックアップ実行（Google Console不要）
  - Android: Storage Access Framework (SAF) でユーザー指定フォルダに自動保存
  - iOS: ドキュメントディレクトリ生成 + 共有ダイアログ表示
  - 最終バックアップ時刻をSystemSettingsに記録
- [x] **Progressive機能解放（タブゲート）** - 初心者の認知負荷軽減
  - Quest: 常時表示（最優先アクション）
  - Route: 書籍1冊以上で解放
  - Bank: LEX発生または稼働中書籍で解放
  - Settings: 書籍2冊以上で解放
- [x] **Onboardingペルソナ拡張** - A（効率派）/B（習慣派）に加え、C（超シンプル）を追加
  - ペルソナCはオンボーディング最速スキップ、即Quest画面遷移
- [x] **Metroレイアウト非同期キャッシュ** - `computeMetroLayoutCached()`で差分検出＋キャッシュヒット、UI blocking回避
- [x] **Zodスキーマアダプタ** - DB row → domain正規化の統一レイヤー、バリデーション・型安全性向上

#### データ安全性強化（v7.2.1-7.2.2）- **評価フィードバック対応**
- [x] **クラウド自動同期（iCloud/Google Drive）** - ユーザー意識不要の裏側バックアップ
  - iOS: iCloud Container統合（Info.plist設定で完全動作）
  - Android: Google Drive App Data folder統合（実装中）
  - 起動・復帰時に`performCloudBackup()`自動実行、データロスト防止
- [x] **プリセットルートのワンタップ展開（v7.2.2新機能）** - 導入障壁の完全排除
  - `/preset-routes` 画面でカテゴリ別フィルタ（資格試験/プログラミング/語学）
  - TOEIC 800点/簿記3級/基本情報技術者/React入門の4ルート完全実装
  - 依存関係（previousBookId）・推定日数・Amazonアフィリエイトリンク完備
  - 初回起動時にOnboarding完了→バックアップ設定→プリセット選択→即スタート可能
  - Books画面から「厳選ルートマップ」ボタンで再アクセス可能
  - 選択/スキップ後は`@chiritsumo_preset_route_selected`フラグで次回表示スキップ
- [x] **ローエンド端末対応** - Android 8以下/RAM 2GB未満で自動最適化
  - BlurView完全無効化、ソリッドカラーに自動切替
  - `shouldUseBlurView()`でコンポーネント側から判定可能
  - パフォーマンス劣化による低評価防止
- [x] **初回起動バックアップ設定促進** - データロスト低評価爆撃の最前線
  - `app/backup-setup.tsx`でクラウド vs 手動の選択UI
  - スキップ可能だが警告表示、ユーザー判断を尊重
- [x] **DB整合性チェック＋自動復旧** - 起動時の自動診断・修復フロー
  - 外部キー違反・不正データ・残高不整合を検出
  - 破損時はクラウドバックアップから自動復元提案
  - `dbIntegrityCheck.ts`でヘルスチェック実装

#### ストア対応
- [x] app.jsonにカメラ権限説明追加
- [x] プライバシーポリシーHTML作成

### 前提条件

```bash
node >= 18.x
npm >= 9.x
**⚠️ 本番環境でのリリース前に必ず以下を実施してください:**

1. **RevenueCat APIキーの設定**
   ```bash
   # .env.example を .env にコピー
   cp .env.example .env
   
   # .env にRevenueCatの本番APIキーを記入
   EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_xxxxxxxxxxxxxxxx
   EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_xxxxxxxxxxxxxxxx
   ```

2. **詳細なチェックリスト**
   - `RELEASE_CHECKLIST.md` を参照
   - 実機テスト、課金フロー、バックアップ復元の検証が必須

### インストール

```bash
# パッケージインストール
npm install

# 開発サーバー起動
npm run dev
```

### 本番環境への準備

#### 1. Web版の制限事項（重要）

**⚠️ Web版は廃止されました（v7.1.0以降）:**
- **ネイティブ（SQLite）のみに統一** - IndexedDB実装を削除
- `db.ts` は `db.native.ts` を直接エクスポート
- メンテナンスコスト削減・型安全性向上のための戦略的決定

**推奨構成:**
- 本番リリース：**ネイティブアプリのみ配布**（iOS/Android）
- Web版：非対応

#### 2. バックアップ方針（ゼロ運用コスト + クラウド同期）

**v7.2.1より完全自動バックアップに進化（ユーザー意識不要）:**
- **iOS**: iCloud Container自動同期（Info.plist設定で有効化、裏で自動保存）
- **Android**: Google Drive App Data folder自動同期（実装中、SAF代替）
- **ローカルバックアップ**: Storage Access Framework (SAF) でユーザー指定フォルダに自動保存（v7.2.0互換）
- **手動バックアップ**: 引き続き設定画面からJSON Export/Import可能
- **トリガー**: アプリ起動時・バックグラウンド復帰時に自動実行
- **復旧**: 起動時にDB整合性チェック、破損検知時は自動復元提案

**「Local Firstの不便さ」をUXで完全隠蔽** - データロスト恐怖を排除し、安心して使える設計。

### RevenueCat設定（本番環境）

**⚠️ リリース前に必ず `.env` ファイルを作成してください:**

```bash
# .env.example を .env にコピー
cp .env.example .env

# .env にRevenueCatの本番APIキーを記入
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_xxxxxxxxxxxxxxxx
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_xxxxxxxxxxxxxxxx
```

詳細は `RELEASE_CHECKLIST.md` を参照してください。

### プライバシーポリシーのホスティング

`app/privacy-policy.tsx` の内容をHTMLとして抽出し、GitHub Pages等にデプロイしてください。  
デプロイ後、`app/(tabs)/settings.tsx` のプライバシーポリシーリンクを更新してください。

**ストア申請時は必ずURLを登録してください。**

## 📤 Release Preparation

リリース前の詳細なチェックリストは **`RELEASE_CHECKLIST.md`** を参照してください。

**致命的なブロッカー（リリース前に修正必須）:**
- [ ] RevenueCat APIキー設定（`.env` ファイル）
- [ ] プライバシーポリシーのWeb公開
- [ ] 実機での課金フローテスト（Sandbox）
- [ ] バックアップ復元の完全検証

## 🛠 Development


```
app/
├── (tabs)/              # タブナビゲーション
│   ├── quest.tsx        # 学習クエスト画面
│   ├── route.tsx        # 路線図画面
│   ├── bank.tsx         # 読書銀行画面
│   ├── books.tsx        # 書籍一覧
│   └── edit.tsx         # 書籍編集
├── paywall.tsx          # Paywallスクリーン
├── backup-setup.tsx     # ✅ v7.2.1: 初回起動バックアップ設定促進
├── recovery.tsx         # ✅ v7.2.1: DB破損復旧UI
├── preset-routes.tsx    # ✅ v7.2.2新規: プリセットルート選択画面

core/                    # アプリケーションコア（app外に配置）
├── components/
│   ├── BankruptcyWarning.tsx
│   ├── BookNode.tsx
│   └── ...
├── database/
│   ├── schema.ts
│   └── zodAdapters.ts  # ✅ v7.2.0新規: Zod正規化レイヤー
├── repository/         # Repository Pattern（Drizzle移行完了）
│   ├── BookRepository.ts
│   └── InventoryPresetRepository.ts
├── fsrs/               # FSRS v5スケジューラ
├── layout/
│   └── metroLayout.ts  # ✅ v7.2.0拡張: 非同期キャッシュ関数追加
├── logic/              # ビジネスロジック
│   ├── bankruptcyLogic.ts
│   ├── lexCalculator.ts
│   └── rolloverLogic.ts
├── services/
│   ├── bookDataService.ts     # OpenBD + Google Books統合
│   ├── BookService.ts
│   ├── backupService.ts       # 手動バックアップ（JSON）
│   ├── safBackupService.ts    # ✅ v7.2.0: Android SAF自動バックアップ
│   ├── iosBackupService.ts    # ✅ v7.2.0: iOS自動バックアップ
│   ├── cloudBackupService.ts  # ✅ v7.2.1新規: iCloud/GoogleDrive統合
│   └── aiAffiliate.ts
├── servicesV2/         # 次世代サービス層（設計中）
│   ├── CardQueryService.ts
│   ├── StudyFlowService.ts
│   └── RouteLayoutService.ts
├── store/              # Zustand（Drizzle Repository統合完了）
│   ├── bookStore.ts    # ✅ DrizzleBookRepository使用
│   ├── cardStore.ts    # ✅ DrizzleCardRepository/LedgerRepository使用
│   └── subscriptionStore.ts
├── theme/
│   ├── colors.ts
│   └── glassEffect.ts  # ✅ v7.2.1拡張: shouldUseBlurView()でローエンド対応
├── types/
│   └── index.ts
├── presets/                 # ✅ v7.2.1-7.2.2: プリセットルートテンプレート
│   └── presetRouteTemplates.ts  # TOEIC/簿記/情報処理/React入門 完全実装
└── utils/
    ├── bookLogic.ts
    ├── dailyRollover.ts
    ├── dateUtils.ts
    └── dbIntegrityCheck.ts   # ✅ v7.2.1新規: DB整合性チェック・自動復旧

hooks/
└── useQuestData.ts     # Quest画面データ統合フック（Repository使用）
```

## 📋 リリース前チェックリスト

### Phase 4: Release Preparation

- [ ] **実機テスト（iOS）**
  - [ ] Book登録制限の動作確認
  - [ ] Chunk Size プリセット/カスタム切替（Pro/Free）
  - [ ] カメラ権限の動作確認
  - [ ] バックアップExport/Importテスト
  - [ ] RevenueCat課金フローテスト

- [ ] **実機テスト（Android）**
  - [ ] 同上
  - [ ] Chunk Size プリセット/カスタム切替（Pro/Free）

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

## 💾 Backup（完全自動 + 手動）

### クラウド自動同期（v7.2.1新規）- **推奨**
- **iOS**: iCloud Container統合（Info.plist設定で有効化、ユーザー意識不要）
- **Android**: Google Drive App Data folder統合（実装中）
- **裏側で自動実行**: 起動・復帰時に`performCloudBackup()`
- **自動復旧**: 起動時にDB整合性チェック、破損検知時は自動復元提案
- **データロスト恐怖の完全排除**: 端末水没・紛失でも安心

### ローカル自動バックアップ（v7.2.0）
- **Android**: Storage Access Framework (SAF) でユーザー指定フォルダに自動保存
- **iOS**: ドキュメントディレクトリ生成後、共有ダイアログで保存先選択
- **トリガー**: アプリ起動時・バックグラウンド復帰時に自動実行
- **最終バックアップ時刻**: SystemSettingsに記録、Toast通知で確認可能

### 手動バックアップ（レガシー互換）
- Settings画面から JSON形式でエクスポート/インポート可能
- 全データ（Books, Cards, Ledger）を含む完全バックアップ
- OS標準の共有シートを利用（壊れにくく、維持費ゼロ）

## 🗄️ Database Architecture

### 現在の構成（v7.1.0）

**統一方針: SQLite (Drizzle ORM) のみ**

Web版（IndexedDB）を廃止し、ネイティブ（SQLite）に一本化しました。これによりメンテナンスコストを削減し、型安全性を向上させています。

### Repository Pattern（Drizzle ORM移行完了）

生SQLを排除し、型安全なDrizzle ORMを使用したRepository Patternに移行完了しました。

**実装済みリポジトリ:**
```typescript
// core/repository/
DrizzleBookRepository         // Books CRUD
DrizzleCardRepository         // Cards CRUD + Due/New queries
DrizzleLedgerRepository       // Ledger CRUD + Upsert
DrizzleInventoryPresetRepository  // Presets CRUD
```

**移行状況:**
- ✅ **Repository層**: 全4リポジトリ完全実装
- ✅ **Store層**: `bookStore`, `cardStore` のDrizzle統合完了
- ✅ **Hook層**: `useQuestData` のRepository化完了
- 🔄 **UI層**: `quest.tsx`の一部でレガシーDB参照が残存（段階的移行中）

**利点:**
- 型安全なクエリビルダ（`eq`, `and`, `lte`, `inArray`等）
- スキーマ変更時のコンパイルエラー検出
- テストコードでモックRepository注入可能
- 生SQLの散在を防止、保守性向上

### Schema Definition

```typescript
// core/database/schema.ts
export const books = sqliteTable('books', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  user_id: text('user_id'),
  subject_id: integer('subject_id'),
  isbn: text('isbn'),
  pages: integer('pages'),
  completed_unit: integer('completed_unit').default(0),
  chunk_size: integer('chunk_size').default(1),
  cover_path: text('cover_path'),
  target_completion_date: text('target_completion_date'),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
});

export const cards = sqliteTable('cards', {
  id: text('id').primaryKey(),
  book_id: text('book_id').notNull().references(() => books.id, { onDelete: 'cascade' }),
  unit_index: integer('unit_index').notNull(),
  due: text('due').notNull(),
  stability: real('stability').notNull(),
  difficulty: real('difficulty').notNull(),
  // ... FSRS関連フィールド
});

export const ledger = sqliteTable('ledger', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull().unique(),
  balance: integer('balance').notNull().default(0),
  // ... 取引関連フィールド
});

export const inventoryPresets = sqliteTable('inventory_presets', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  book_ids: text('book_ids').notNull(), // JSON serialized array
  created_at: text('created_at').notNull(),
});
```

### 外部キー制約の有効化

SQLiteの外部キー制約はデフォルトで無効なため、明示的に有効化しています：

```typescript
// core/database/drizzleClient.ts
const sqlite = SQLite.openDatabaseSync('chiritsumo.db');
sqlite.execSync('PRAGMA foreign_keys = ON;');
const db = drizzle(sqlite);
```

これにより、`books`削除時に関連`cards`が自動CASCADE削除されます。

### 移行戦略

**Phase 1（完了）**: Repository実装 + Store層統合  
**Phase 2（完了）**: UI層の残存レガシー参照を段階排除  
**Phase 3（完了）**: `db.native.ts`削除、完全Drizzle化達成（v7.1.0）  
**Phase 4（完了）**: Zodアダプタ導入、自動バックアップ統合、UX最適化（v7.2.0）  
**Phase 5（完了）**: データ安全性強化、クラウド同期、プリセットルート、DB復旧（v7.2.1）  
**Phase 6（完了）**: プリセットルート展開UI完全実装、Books画面統合（v7.2.2）

## 🎨 デザインシステム: "Aurora Glass"

- **Theme**: Dark Mode Only (Deep Space Black)
- **Visual**: すりガラス（Blur）と発光（Neon Gradient）
- **Colors**:
  - Pass/Gain: Aurora Green (#00F260)
  - Fail/Debt: Plasma Red (#FF416C)
  - Route/Link: Electric Blue (#2980B9)

## 🧠 使い方のヒント（v7.2.2）

### 基本的な使い方
- 日次Lex目標は時間で考える（例: 1800 Lex ≒ 3時間）
- Solve/Read/Memoのどれを選んでも、時間あたりの報酬は公平（1分=10 Lex）
- 少しずつ貯金して、Time Freeze（休暇）を買うのがおすすめ
- 実績カードを定期的にSNSでシェアして、習慣化とモチベ維持

### クイックスタート（プリセットルート活用）

**v7.2.2の最大の改善点：「何を勉強すればいいかわからない」を完全解決**

#### 初回起動フロー
1. Onboarding完了（ペルソナ選択）
2. バックアップ設定（クラウド推奨、スキップ可）
3. **プリセットルート選択（NEW!）**
   - カテゴリフィルタで目的別に絞り込み
   - 資格試験: TOEIC 800点、簿記3級、基本情報技術者
   - プログラミング: React入門（JS基礎→React→TS→Next.js）
   - ワンタップで全書籍一括登録（依存関係も自動設定）
4. そのまま学習開始（Quest画面へ）

#### 既存ユーザー向け
- Books画面の「厳選ルートマップ」ボタンからいつでもアクセス可能
- 新しい目標ができたら追加でプリセット展開OK
- 自分で書籍登録するのと併用可能

#### プリセットの特徴
- **依存関係完備**: 「基礎文法→問題集→実践」の最適順序を自動設定
- **推定日数表示**: 完走までの目安が事前にわかる
- **難易度ラベル**: 初級/中級/上級で自分のレベルに合ったルートを選択
- **Amazonアフィリエイト**: 気になる書籍をすぐ購入可能（開発者支援も兼ねる）

**もう「何から始めればいいの？」で迷わない。**

### 受験生向けメンタル支柱機能

**Chiritsumoは「管理ツール」から「心のパートナー」へ進化しました。**

#### 1️⃣ 合格ナビ（Exam GPS）
- **場所**: マイルート画面（Route）
- **効果**: 計画錯誤の予防（"間に合わない"恐怖の解消）
- **仕組み**: 
  - 目標完了日と予測完了日を自動比較
  - 遅れている場合、具体的な追加学習量を提示
  - 例：「1日あたり150 XP（約15分）増やせば間に合います」

#### 2️⃣ リベンジモード
- **場所**: 読書銀行（Bank）画面
- **効果**: 回避欲求のハック（借金 → ボーナスチャンスへ）
- **仕組み**: 
  - 残高マイナス時に🔥アイコン + 倍率表示（1.5x / 2x / 3x）
  - 「REVENGE MODE」演出で前向きな気持ちに切り替え
  - 「今なら獲得XPがX倍！」と明るいメッセージ

#### 3️⃣ 絶対的ネクストアクション
- **場所**: 今日のクエスト（Quest）画面
- **効果**: 決断疲れの完全排除（"何をするか"を考える必要ゼロ）
- **仕組み**: 
  - 画面を開いたら巨大な単一アクションボタンのみ表示
  - 詳細情報はデフォルト非表示（トグルで見られる）
  - 迷わず「復習開始」または「新規学習開始」をタップ

#### 4️⃣ 積み上げタワー
- **場所**: 読書銀行（Bank）画面
- **効果**: 承認欲求・孤独感の充足（努力の可視化）
- **仕組み**: 
  - 累計獲得XPを物理的な高さ（cm/m）に変換
  - 「文庫本X冊分」「ビルX階相当」「東京タワーX個分」など比喩表示
  - 努力が目に見える形で積み上がる達成感

**これらの機能は、受験生の心理的負担を軽減し、学習継続をサポートします。**

## 📄 ライセンス

All rights reserved.

## 📧 Contact

Email: privacy@chiritsumo.app

---

**Built with ❤️ for serious learners**

