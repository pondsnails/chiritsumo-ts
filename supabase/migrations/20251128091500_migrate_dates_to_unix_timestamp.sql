-- Phase 6 Critical: Migrate date fields to Unix Timestamp (SQLite)
-- Tables affected: cards, books, ledger
-- Note: SQLite does not support ALTER COLUMN TYPE; we recreate tables.

BEGIN TRANSACTION;

-- 1) cards: add created_at, convert due/last_review to INTEGER (unix timestamp)

-- Create new cards table with desired schema
CREATE TABLE IF NOT EXISTS cards_new (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL,
  unit_index INTEGER NOT NULL,
  due INTEGER NOT NULL,            -- previously TEXT ISO8601
  last_review INTEGER,             -- previously TEXT ISO8601 or NULL
  created_at INTEGER NOT NULL      -- new column (unix timestamp)
);

-- Copy data with conversion from ISO8601 to unix seconds
INSERT INTO cards_new (id, book_id, unit_index, due, last_review, created_at)
SELECT
  id,
  book_id,
  unit_index,
  CAST(strftime('%s', due) AS INTEGER),
  CASE WHEN last_review IS NULL OR last_review = '' THEN NULL ELSE CAST(strftime('%s', last_review) AS INTEGER) END,
  -- created_at: fallback to last_review or due or now
  CASE
    WHEN last_review IS NOT NULL AND last_review <> '' THEN CAST(strftime('%s', last_review) AS INTEGER)
    WHEN due IS NOT NULL AND due <> '' THEN CAST(strftime('%s', due) AS INTEGER)
    ELSE CAST(strftime('%s','now') AS INTEGER)
  END
FROM cards;

-- Replace table
DROP TABLE cards;
ALTER TABLE cards_new RENAME TO cards;

-- 2) books: convert created_at/updated_at/target_completion_date to INTEGER

CREATE TABLE IF NOT EXISTS books_new (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  subject_id TEXT,
  title TEXT NOT NULL,
  isbn TEXT,
  mode INTEGER NOT NULL,
  total_unit INTEGER NOT NULL,
  chunk_size INTEGER NOT NULL,
  completed_unit INTEGER,
  status INTEGER NOT NULL,
  previous_book_id TEXT,
  priority INTEGER,
  cover_path TEXT,
  target_completion_date INTEGER,  -- was TEXT
  created_at INTEGER NOT NULL,     -- was TEXT
  updated_at INTEGER NOT NULL      -- was TEXT
);

INSERT INTO books_new (
  id, user_id, subject_id, title, isbn, mode, total_unit, chunk_size, completed_unit, status,
  previous_book_id, priority, cover_path, target_completion_date, created_at, updated_at
)
SELECT
  id, user_id, subject_id, title, isbn, mode, total_unit, chunk_size, completed_unit, status,
  previous_book_id, priority, cover_path,
  CASE WHEN target_completion_date IS NULL OR target_completion_date = '' THEN NULL ELSE CAST(strftime('%s', target_completion_date) AS INTEGER) END,
  CAST(strftime('%s', COALESCE(created_at, datetime('now'))) AS INTEGER),
  CAST(strftime('%s', COALESCE(updated_at, created_at, datetime('now'))) AS INTEGER)
FROM books;

DROP TABLE books;
ALTER TABLE books_new RENAME TO books;

-- 3) ledger: convert date to INTEGER

CREATE TABLE IF NOT EXISTS ledger_new (
  date INTEGER PRIMARY KEY,       -- was TEXT
  earned_lex REAL,
  target_lex REAL,
  balance REAL
);

INSERT INTO ledger_new (date, earned_lex, target_lex, balance)
SELECT CAST(strftime('%s', date) AS INTEGER), earned_lex, target_lex, balance FROM ledger;

DROP TABLE ledger;
ALTER TABLE ledger_new RENAME TO ledger;

COMMIT;