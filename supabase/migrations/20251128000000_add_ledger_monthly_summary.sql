-- Ledger Monthly Summary Table for Performance Optimization
-- 月次集計データを保存してクエリ速度を向上

CREATE TABLE IF NOT EXISTS ledger_monthly_summary (
  year_month TEXT PRIMARY KEY, -- Format: 'YYYY-MM'
  total_earned_lex INTEGER NOT NULL DEFAULT 0,
  total_target_lex INTEGER NOT NULL DEFAULT 0,
  avg_daily_earned INTEGER NOT NULL DEFAULT 0,
  avg_daily_target INTEGER NOT NULL DEFAULT 0,
  days_count INTEGER NOT NULL DEFAULT 0,
  max_balance INTEGER NOT NULL DEFAULT 0,
  min_balance INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ledger_monthly_summary_year_month ON ledger_monthly_summary(year_month);

-- Trigger to auto-update monthly summary when ledger changes
CREATE TRIGGER IF NOT EXISTS update_monthly_summary_after_ledger_insert
AFTER INSERT ON ledger
BEGIN
  INSERT INTO ledger_monthly_summary (
    year_month,
    total_earned_lex,
    total_target_lex,
    avg_daily_earned,
    avg_daily_target,
    days_count,
    max_balance,
    min_balance,
    updated_at
  )
  SELECT
    strftime('%Y-%m', NEW.date, 'unixepoch') as year_month,
    SUM(earned_lex) as total_earned_lex,
    SUM(target_lex) as total_target_lex,
    AVG(earned_lex) as avg_daily_earned,
    AVG(target_lex) as avg_daily_target,
    COUNT(*) as days_count,
    MAX(balance) as max_balance,
    MIN(balance) as min_balance,
    strftime('%s','now') as updated_at
  FROM ledger
  WHERE strftime('%Y-%m', date, 'unixepoch') = strftime('%Y-%m', NEW.date, 'unixepoch')
  ON CONFLICT(year_month) DO UPDATE SET
    total_earned_lex = excluded.total_earned_lex,
    total_target_lex = excluded.total_target_lex,
    avg_daily_earned = excluded.avg_daily_earned,
    avg_daily_target = excluded.avg_daily_target,
    days_count = excluded.days_count,
    max_balance = excluded.max_balance,
    min_balance = excluded.min_balance,
    updated_at = excluded.updated_at;
END;
