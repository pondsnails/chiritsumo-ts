-- Migrate velocity_measurements.date from TEXT (YYYY-MM-DD) to INTEGER (Unix midnight)
BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS velocity_measurements_new (
  date INTEGER PRIMARY KEY,
  earned_lex INTEGER NOT NULL DEFAULT 0,
  minutes_spent INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);
INSERT INTO velocity_measurements_new (date, earned_lex, minutes_spent, created_at)
SELECT
  /* Convert 'YYYY-MM-DD' text to unix midnight */
  CASE WHEN date LIKE '%-%' THEN CAST(strftime('%s', date || ' 00:00:00') AS INTEGER) ELSE CAST(date AS INTEGER) END,
  earned_lex,
  minutes_spent,
  CASE WHEN created_at IS NULL THEN strftime('%s','now') ELSE created_at END
FROM velocity_measurements;
DROP TABLE velocity_measurements;
ALTER TABLE velocity_measurements_new RENAME TO velocity_measurements;
COMMIT;