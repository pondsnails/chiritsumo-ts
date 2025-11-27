// Auto-generated migration exports for Expo SQLite
// Generated from drizzle-kit

const sql_0000 = `
CREATE TABLE IF NOT EXISTS books (
	id text PRIMARY KEY NOT NULL,
	user_id text DEFAULT 'local-user' NOT NULL,
	subject_id integer,
	title text NOT NULL,
	isbn text,
	mode integer DEFAULT 1 NOT NULL,
	total_unit integer NOT NULL,
	chunk_size integer DEFAULT 1 NOT NULL,
	completed_unit integer DEFAULT 0 NOT NULL,
	status integer DEFAULT 0 NOT NULL,
	previous_book_id text,
	priority integer DEFAULT 1 NOT NULL,
	cover_path text,
	target_completion_date text,
	created_at text DEFAULT (datetime('now')) NOT NULL,
	updated_at text DEFAULT (datetime('now')) NOT NULL
);

CREATE TABLE IF NOT EXISTS cards (
	id text PRIMARY KEY NOT NULL,
	book_id text NOT NULL,
	unit_index integer NOT NULL,
	state integer DEFAULT 0 NOT NULL,
	stability real DEFAULT 0 NOT NULL,
	difficulty real DEFAULT 0 NOT NULL,
	elapsed_days integer DEFAULT 0 NOT NULL,
	scheduled_days integer DEFAULT 0 NOT NULL,
	reps integer DEFAULT 0 NOT NULL,
	lapses integer DEFAULT 0 NOT NULL,
	due text DEFAULT (datetime('now')) NOT NULL,
	last_review text,
	photo_path text,
	FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS inventory_presets (
	id integer PRIMARY KEY NOT NULL,
	label text NOT NULL,
	icon_code integer DEFAULT 0 NOT NULL,
	is_default integer DEFAULT 0 NOT NULL
);

CREATE TABLE IF NOT EXISTS ledger (
	id integer PRIMARY KEY,
	date text NOT NULL,
	earned_lex integer DEFAULT 0 NOT NULL,
	target_lex integer DEFAULT 0 NOT NULL,
	balance integer DEFAULT 0 NOT NULL,
	transaction_type text DEFAULT 'daily',
	note text
);

CREATE UNIQUE INDEX IF NOT EXISTS ledger_date_unique ON ledger(date);

CREATE TABLE IF NOT EXISTS preset_books (
	id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	preset_id integer NOT NULL,
	book_id text NOT NULL,
	FOREIGN KEY (preset_id) REFERENCES inventory_presets(id) ON DELETE CASCADE,
	FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS system_settings (
	key text PRIMARY KEY NOT NULL,
	value text NOT NULL,
	updated_at text DEFAULT (datetime('now')) NOT NULL
);
`;

export default {
  journal: {
    entries: [
      {
        idx: 0,
        version: "5",
        when: Date.now(),
        tag: "0000_initial",
        breakpoints: true
      }
    ]
  },
  migrations: {
    m0000: sql_0000
  }
};
