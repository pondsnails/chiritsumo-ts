# Gemini指摘事項への対応状況

**最新レビュー結果**: 実装は「プロトタイプ」レベル。リリース前に根本的な再設計が必須。

---

## 🚨 優先度0: システムの根幹（即座に着手）

### ❌ マイグレーション管理の欠如【最重要・緊急】
**問題**: 
- `ensureSchema` で生SQLを手動実行
- `drizzle-kit` の機能を使わず、TypeScript型定義とSQL文字列の二重管理
- スキーマ変更時に破綻する設計

**リスク**: 
- リリース後のスキーマ変更が実質不可能
- ユーザーデータの破損リスク
- アップデート時のクラッシュ

**対応**: 
```typescript
// 現状（NG）
await db.execSync(`CREATE TABLE IF NOT EXISTS cards (...)`)

// 正しい実装
import { migrate } from 'drizzle-orm/expo-sqlite/migrator'
await migrate(db, { migrationsFolder: './drizzle' })
```

**ステータス**: 🔴 未着手（即座に対応必須）

### ❌ 全件メモリロードの撲滅【緊急】
**問題**:
- `cardStore.fetchCards()` → `SELECT * FROM cards`
- 1,000枚でメモリ圧迫、5,000枚でクラッシュ確実
- SQLiteの集計機能を無視

**対応**:
```typescript
// NG: 全件取得
const cards = await cardRepo.findAll()

// OK: 必要分のみ取得
const dueCards = await cardRepo.findDue(bookIds, new Date(), limit: 20)

// ヒートマップはSQL集計
SELECT DATE(last_review) as date, COUNT(*) as count 
FROM cards 
WHERE last_review IS NOT NULL 
GROUP BY DATE(last_review)
ORDER BY date DESC 
LIMIT 90
```

**ステータス**: 🔴 未着手（パフォーマンス地雷）

---

## ✅ 優先度1: 致命的なバグの修正（完了）

### ✅ 日付処理のUTC/JST問題
**問題**: `new Date().toISOString().split('T')[0]` はUTC基準の日付を取得するため、日本のユーザーが深夜0:00〜9:00に操作すると「前日」として扱われるバグ

**修正内容**:
- `core/utils/dateUtils.ts` の `getTodayDateString()` と `formatDate()` を使用するよう全ファイルを修正
- 修正したファイル:
  - `core/utils/dailyRollover.ts`
  - `core/utils/streakCalculator.ts`
  - `core/services/StudyTransactionService.ts`
  - `core/services/velocityService.ts`
  - `core/components/BrainAnalyticsDashboard.tsx`

**影響**: ローカルタイムゾーン基準で正確に日付が扱われるようになり、深夜帯のバグが解消

### ✅ ChunkSizeSelectorのバリデーション強化
**問題**: 数値以外の入力や不正な値に対するバリデーションが甘い

**修正内容**:
- 厳密な数値チェック（NaN、Infinity、負の数、小数を弾く）
- 上限値チェック（1000超えを防止）
- 不正入力時は現在の値に戻す

---

## 🚨 優先度2: アーキテクチャの根本的欠陥（緊急）

### ❌ JSON in SQL（velocityService）
**問題**: 時系列データをJSON文字列として`system_settings`に保存

**対応**:
```sql
CREATE TABLE velocity_measurements (
  date TEXT PRIMARY KEY,
  earned_lex INTEGER NOT NULL,
  target_lex INTEGER NOT NULL,
  created_at TEXT NOT NULL
)
```

**ステータス**: 🔴 未着手

### ❌ God Hook化した useQuestData
**問題**: 
- データ取得、計算、フィルタリング、表示ロジックが全て詰め込まれている
- テスト不能、可読性低下、無駄な再レンダリング

**対応**:
- 計算ロジックをService層に完全分離
- フックは「Serviceを呼んでStateに反映」のみ

**ステータス**: 🔴 未着手

### ❌ Repository層の責務過多
**問題**: Repositoryがビジネスロジックを知りすぎている

**対応**: Repository = DB操作のみ、ドメインロジックはService層へ

**ステータス**: 🔴 未着手

---

## 🟡 優先度3: 型安全性とコード品質

### ❌ バックアップ処理の `any` 型
**問題**: `backupService.ts` で型安全性が途切れている

**リスク**: 破損データのインポートでアプリ起動不能

**対応**: Zodスキーマとの完全な型連携

**ステータス**: 🔴 未着手

---

## 📊 進捗サマリー

### 完了項目
- ✅ 日付処理のUTC/JST問題
- ✅ ChunkSizeSelectorバリデーション

### 緊急対応必須（リリースブロッカー）
- 🔴 マイグレーション管理の導入
- 🔴 全件ロードの撲滅
- 🔴 JSON in SQLの正規化

### 重要（技術的負債）
- 🔴 useQuestDataのリファクタリング
- 🔴 Repository/Service責務分離
- 🔴 型安全性の強化

---

## ⚠️ リリース判定

**現状**: プロトタイプレベル。以下を完了するまでリリース非推奨。

**最低限のリリース条件**:
1. ✅ 日付処理バグ修正（完了）
2. 🔴 マイグレーション自動化（**必須**）
3. 🔴 カード全件ロード廃止（**必須**）
4. 🔴 SQL集計への移行（推奨）

**判定**: 🔴 **NOT READY FOR PRODUCTION**

---
