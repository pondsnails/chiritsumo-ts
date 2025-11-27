# Repository Layer (Migration Plan)

このディレクトリは Drizzle ORM への全面移行に伴い、生SQLを排除し型安全な永続化境界を提供するための新レイヤです。

## 移行ステップ概要
1. 現行 `db.native.ts` の生SQL呼び出し一覧抽出 (完了)
2. Drizzle スキーマ (`schema.ts`) を単一ソースオブトゥルース化
3. `createDrizzleClient` 初期化ヘルパの追加 (SQLite / Web 兼用ラッパー設計) ← 次フェーズ
4. Repository は CRUD のみ担当 (フィルタ・集約・業務条件は Service 層へ移動) ✓ Service骨格雛形追加
5. Store(Zustand) からは Service 経由で取得→結果を状態へ反映 (直接DB呼び出し排除)
6. 段階的リネーム: 旧 `booksDB` 等を `legacyBooksDB` にマーキング→最終削除
7. Lex/FSRS 定数外部化 (`core/constants/lexProfile.ts`, `core/config/fsrsConfig.ts`) 導入 (一部完了)

## Repository インターフェース設計指針
- 返却型は Drizzle の `Select` 型を domain DTO に変換 (DBカラムとアプリ型差異を吸収)
- トランザクションは Service 層が orchestration する (複数テーブル更新)
- メソッド命名:
  - CRUD: `create`, `findById`, `findAll`, `update`, `delete`
  - 特殊: `findByIds`, `findPaged` など (ビジネス条件は避ける)

## 未着手 / 次フェーズ TODO
- Drizzleクライアント初期化ユーティリティ実装
- Repositoryメソッドへ Drizzle クエリ実装（現在は空配列スタブ）
- 期限切れカード抽出・レイアウト計算ロジックを ServiceV2 へ完全移設
- Store 参照差し替え (bookStore/cardStore から legacyDB 削除)
- Metroレイアウトキャッシュ (RouteLayoutService)

この README は移行中のみ保持し、完了後は簡潔な利用方法に差し替えます。