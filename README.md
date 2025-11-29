# 📱 Chiritsumo (チリツモ)

**脱・時間管理。成果主義のデジタル学習台帳**

Version: 7.1.0 (Local-First + Zero-Operation Cost)

## 🎯 コンセプト

学習時間（Duration）をKPIとせず、**成果（Lex）と速度（Velocity）** のみを管理指標とする、理系脳・ガチ勢のための自律分散学習プラットフォーム。

### コアバリュー

- **No Time Tracking**: 時間計測の完全廃止。学習の「質」と「量」のみを評価
- **Local First & Speed**: 全データを端末内DB（SQLite）に永続化。完全オフライン動作

- **Runtime**: React Native (Expo SDK 54+)
- **Language**: TypeScript

### ✅ 実装済み（Phase 1-3 完了 / v7.1.0）

#### データベース & コアロジック
- [x] **SQLite (Drizzle ORM)** - Web版廃止、Native専用に統一
- [x] **Repository Pattern移行完了** - Books/Cards/Ledger/InventoryPresetsをDrizzle化
- [x] Read/Solve/Memoの3モード対応
- [x] モード別Retention設定（0.85/0.90/0.80）
- [x] 日次Rollover処理
- [x] Lex残高管理
- [x] 地下鉄路線図風のグラフ描画（マイルート）
- [x] ルートプリセット（厳選書籍の静的リンク集）
- [x] JSONバックアップ機能（Export/Import）
- [x] 設定画面（手動バックアップのみ）
- [x] RevenueCat統合
- [x] Paywallスクリーン（買い切り¥3,600優先／年額¥1,500は補助表示）
- [x] Brain Analytics Dashboard（忘却曲線・ヒートマップ）
- [x] Shareable Stats（SNS向け実績カード生成・共有）
- [x] BASE_LEXを時間価値で統一（1分=10 Lex）
  - Read: 30 / Solve: 50 / Memo: 1
  - 15分=150 / 1h=600 / 3h=1800 / 5h=3000（Pro） / 8h=4800（Pro）
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

#### 2. バックアップ方針（ゼロ運用コスト）

本アプリは「手動バックアップ（JSON）」のみに対応します。OS標準の共有シートでエクスポート/インポートでき、壊れにくく維持費ゼロです。

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

core/                    # アプリケーションコア（app外に配置）
│   ├── BankruptcyWarning.tsx
│   ├── BookNode.tsx
│   └── ...
├── database/
├── repository/         # Repository Pattern（Drizzle移行完了）
│   ├── BookRepository.ts
│   └── InventoryPresetRepository.ts
├── fsrs/               # FSRS v5スケジューラ
│   └── metroLayout.ts
├── logic/              # ビジネスロジック
│   ├── bankruptcyLogic.ts
│   ├── lexCalculator.ts
│   └── rolloverLogic.ts
├── services/
│   ├── bookDataService.ts  # OpenBD + Google Books統合
│   ├── BookService.ts
│   ├── backupService.ts
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
│   └── glassEffect.ts
├── types/
│   └── index.ts
└── utils/
    ├── bookLogic.ts
    ├── dailyRollover.ts
    └── dateUtils.ts

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

## 💾 Backup（手動のみ）

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

