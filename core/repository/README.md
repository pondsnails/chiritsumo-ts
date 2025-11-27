# Repository Layer (Migration Plan)

このディレクトリは Drizzle ORM への全面移行に伴い、生SQLを排除し型安全な永続化境界を提供するための新レイヤです。

## 移行ステップ概要
1. 現行 `db.native.ts` の生SQL呼び出し一覧抽出 (完了)
2. Drizzle スキーマ (`schema.ts`) を単一ソースオブトゥルース化
3. `DrizzleClient` 初期化ヘルパの追加 (SQLite / Web 兼用ラッパー設計)
4. Repository は CRUD のみ担当 (フィルタ・集約・業務条件は Service 層へ移動)
5. Store(Zustand) からは Repository 経由で取得→結果を状態へ反映 (書き込みは Service 経由)
6. 段階的リネーム: 旧 `booksDB` 等を `legacyBooksDB` にマーキング→最終削除

## Repository インターフェース設計指針
- 返却型は Drizzle の `Select` 型を domain DTO に変換 (DBカラムとアプリ型差異を吸収)
- トランザクションは Service 層が orchestration する (複数テーブル更新)
- メソッド命名:
  - CRUD: `create`, `findById`, `findAll`, `update`, `delete`
  - 特殊: `findByIds`, `findPaged` など (ビジネス条件は避ける)

## 未着手 TODO
- Drizzleクライアント初期化ユーティリティ追加
- 各Repositoryの骨格ファイル作成
- Service層 (`core/services/*`) に期限切れカード抽出ロジック移設

この README は移行中のみ保持し、完了後は簡潔な利用方法に差し替えます。