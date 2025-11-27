# Phase 6: 重大なバグ修正と一貫性の確保

## 実施日: 2025年11月27日

## 概要
Phase 5までのリファクタリングで「見た目の整理」は進んだが、**データの安全性**と**一貫性**に重大な問題が残っていた。
本Phaseでは「プロダクトとしての堅牢性」を最優先に、致命的なバグを修正。

---

## 🔥 修正した重大な問題

### 1. データ消失リスクの解消 (最優先)

#### 問題
`backupService.ts` の `importBackup` (replace モード) で、全データ削除→挿入が**トランザクション化されていなかった**。
```typescript
// Before (危険)
await cardRepo.deleteAll();
await bookRepo.deleteAll();
await ledgerRepo.deleteAll();
// ↑ ここでエラーが起きたら全データ消失
await bookRepo.bulkUpsert(normalizedBooks);
```

#### 修正内容
- **全削除→挿入を単一トランザクションで実行**
- エラー時は完全ロールバックされ、データは元のまま保護される

```typescript
// After (安全)
await db.transaction(async (tx) => {
  await tx.delete(cards);
  await tx.delete(books);
  await tx.delete(ledger);
  
  if (normalizedBooks.length > 0) {
    await tx.insert(books).values(...);
  }
  // ... 全ての操作が成功して初めてコミット
});
```

**影響範囲**: バックアップリストア機能全体
**重要度**: 🔴 **リリースブロッカー級**

---

### 2. 破産機能のUX改善

#### 問題
Free版で `-1000 Lex` になると**全データリセット（強制破産）**という仕様が、ユーザー体験として最悪。
数ヶ月の学習記録が目標未達だけで消滅するのは「理不尽」。

#### 修正内容
- **データ削除 → 機能制限** に変更
- 借金超過時は「新規カード追加不可」など機能をロックするが、データは保持
- ユーザーは復習でLexを稼いで借金返済すれば機能が再開

```typescript
// Before
canBankrupt: true, // 破産可能
message: '破産状態です。全データをリセットして再出発できます。'

// After
isFunctionLocked: true, // 機能制限
message: '借金が上限に達しました。新規カードの追加が制限されています。復習でLexを稼いで借金を返済してください。'
```

**影響範囲**: `bankruptcyLogic.ts`, UI表示（bank.tsx等）
**重要度**: 🟡 **ユーザー離脱を防ぐ重要な改善**

---

### 3. Store層のDI対応（部分対応）

#### 問題
Store層がRepositoryの実装クラスに直接依存しており、**ユニットテストが書けない**状態。

```typescript
// Before (密結合)
const bookRepo = new DrizzleBookRepository(); // 直書き
export const useBookStore = create<BookState>((set, get) => { ... });
```

#### 修正内容
- Storeをファクトリーパターンで生成し、Repositoryを注入可能に
- テスト時はモックRepositoryを注入できる

```typescript
// After (DI対応)
export function createBookStore(bookRepo: IBookRepository) {
  return create<BookState>((set, get) => { ... });
}

// 本番用デフォルトインスタンス
const defaultBookRepo = new DrizzleBookRepository();
export const useBookStore = createBookStore(defaultBookRepo);
```

**影響範囲**: `bookStore.ts` (他のStoreは未対応)
**重要度**: 🟢 **テスタビリティ向上（段階的対応）**

---

## 🚧 未対応の課題（今後のPhaseで対応）

### 1. 日付管理の混在
- `timestampUtils.ts` (Unix Timestamp推奨) と既存実装 (ISO8601文字列) が混在
- データベーススキーマはまだ `text` (ISO8601)
- **対応方針**: マイグレーションでカラム定義を `integer` に変更し、アプリ全体で `timestampUtils` に統一

### 2. その他のStore層のDI化
- `cardStore.ts`, `subscriptionStore.ts` などは未対応
- **対応方針**: `bookStore` のパターンを横展開

### 3. N+1問題の解消
- `DrizzleInventoryPresetRepository.ts` で結合をJavaScript側で実行している
- **対応方針**: SQLの `JOIN` で解決

### 4. `any` 型の削減
- `backupService.ts` などで `any` が残っている
- **対応方針**: Zodパース後の型を正しく推論させる

---

## まとめ

Phase 6では**「見せかけのリファクタリング」を止めて、データの安全性を最優先**に修正を実施。
特に「バックアップリストアのトランザクション化」は、商用リリース前に**必須**の対応だった。

次のPhaseでは、日付管理の統一とStore層のDI完全対応を進める。
