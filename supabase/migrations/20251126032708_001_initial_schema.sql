/*
  # ChiriTsumo Initial Schema

  1. New Tables
    - `books`
      - `id` (uuid, primary key) - 書籍ID
      - `user_id` (uuid) - ユーザーID（将来の拡張用）
      - `subject_id` (integer) - 科目ID
      - `title` (text) - 書籍タイトル
      - `isbn` (text) - ISBNコード
      - `mode` (integer) - 学習モード (0=Read, 1=Solve, 2=Memo)
      - `total_unit` (integer) - 総ユニット数
      - `completed_unit` (integer) - 完了ユニット数
      - `status` (integer) - ステータス (0=Active, 1=Locked, 2=Graduated)
      - `previous_book_id` (uuid) - 前の書籍ID（路線図用）
      - `priority` (integer) - 優先度 (0=Normal, 1=High)
      - `cover_path` (text) - カバー画像パス
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `cards`
      - `id` (uuid, primary key) - カードID
      - `book_id` (uuid) - 書籍ID
      - `unit_index` (integer) - ユニット番号
      - `state` (integer) - FSRSステート (0=New, 1=Learning, 2=Review, 3=Relearning)
      - `stability` (real) - FSRS安定性
      - `difficulty` (real) - FSRS難易度
      - `due` (timestamptz) - 復習期日
      - `last_review` (timestamptz) - 最終復習日
      - `reps` (integer) - 復習回数
      - `photo_path` (text) - 写真メモパス
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `ledger`
      - `id` (bigserial, primary key)
      - `user_id` (uuid) - ユーザーID
      - `date` (date) - 日付
      - `earned_lex` (integer) - 獲得Lex
      - `target_lex` (integer) - 目標Lex
      - `balance` (integer) - 残高
      - `created_at` (timestamptz)

    - `inventory_presets`
      - `id` (bigserial, primary key)
      - `user_id` (uuid) - ユーザーID
      - `label` (text) - ラベル
      - `icon_code` (integer) - アイコンコード
      - `book_ids` (text[]) - 書籍IDリスト
      - `is_default` (boolean) - デフォルトフラグ
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for user-specific data access
    - Public read access for demonstration purposes (no auth required for now)

  3. Indexes
    - Index on cards(due, state, book_id) for efficient due card queries
    - Index on cards(book_id, unit_index) for book-specific queries
    - Index on books(status, priority) for active book queries
    - Index on ledger(user_id, date) for daily ledger queries
*/

-- Create books table
CREATE TABLE IF NOT EXISTS books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT gen_random_uuid(),
  subject_id integer DEFAULT 0,
  title text NOT NULL,
  isbn text,
  mode integer NOT NULL DEFAULT 0 CHECK (mode IN (0, 1, 2)),
  total_unit integer NOT NULL DEFAULT 1,
  completed_unit integer NOT NULL DEFAULT 0,
  status integer NOT NULL DEFAULT 0 CHECK (status IN (0, 1, 2)),
  previous_book_id uuid REFERENCES books(id) ON DELETE SET NULL,
  priority integer NOT NULL DEFAULT 0 CHECK (priority IN (0, 1)),
  cover_path text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create cards table
CREATE TABLE IF NOT EXISTS cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  unit_index integer NOT NULL,
  state integer NOT NULL DEFAULT 0 CHECK (state IN (0, 1, 2, 3)),
  stability real NOT NULL DEFAULT 0,
  difficulty real NOT NULL DEFAULT 0,
  due timestamptz NOT NULL DEFAULT now(),
  last_review timestamptz,
  reps integer NOT NULL DEFAULT 0,
  photo_path text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(book_id, unit_index)
);

-- Create ledger table
CREATE TABLE IF NOT EXISTS ledger (
  id bigserial PRIMARY KEY,
  user_id uuid DEFAULT gen_random_uuid(),
  date date NOT NULL,
  earned_lex integer NOT NULL DEFAULT 0,
  target_lex integer NOT NULL DEFAULT 0,
  balance integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Create inventory_presets table
CREATE TABLE IF NOT EXISTS inventory_presets (
  id bigserial PRIMARY KEY,
  user_id uuid DEFAULT gen_random_uuid(),
  label text NOT NULL,
  icon_code integer NOT NULL,
  book_ids text[] DEFAULT '{}',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cards_due ON cards (due, state, book_id);
CREATE INDEX IF NOT EXISTS idx_cards_book ON cards (book_id, unit_index);
CREATE INDEX IF NOT EXISTS idx_books_status ON books (status, priority);
CREATE INDEX IF NOT EXISTS idx_ledger_user_date ON ledger (user_id, date);
CREATE INDEX IF NOT EXISTS idx_inventory_user ON inventory_presets (user_id);

-- Enable Row Level Security
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_presets ENABLE ROW LEVEL SECURITY;

-- Create permissive policies (no auth required for demo)
CREATE POLICY "Allow all operations on books" ON books FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on cards" ON cards FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on ledger" ON ledger FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on inventory_presets" ON inventory_presets FOR ALL USING (true) WITH CHECK (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_books_updated_at BEFORE UPDATE ON books
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cards_updated_at BEFORE UPDATE ON cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
