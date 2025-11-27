PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_books` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text DEFAULT 'local-user' NOT NULL,
	`subject_id` integer,
	`title` text NOT NULL,
	`isbn` text,
	`mode` integer DEFAULT 1 NOT NULL,
	`total_unit` integer NOT NULL,
	`chunk_size` integer DEFAULT 1 NOT NULL,
	`completed_unit` integer DEFAULT 0 NOT NULL,
	`status` integer DEFAULT 0 NOT NULL,
	`previous_book_id` text,
	`priority` integer DEFAULT 1 NOT NULL,
	`cover_path` text,
	`target_completion_date` integer,
	`created_at` integer DEFAULT strftime('%s','now') NOT NULL,
	`updated_at` integer DEFAULT strftime('%s','now') NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_books`("id", "user_id", "subject_id", "title", "isbn", "mode", "total_unit", "chunk_size", "completed_unit", "status", "previous_book_id", "priority", "cover_path", "target_completion_date", "created_at", "updated_at") SELECT "id", "user_id", "subject_id", "title", "isbn", "mode", "total_unit", "chunk_size", "completed_unit", "status", "previous_book_id", COALESCE("priority", 1), "cover_path", "target_completion_date", "created_at", "updated_at" FROM `books`;--> statement-breakpoint
DROP TABLE `books`;--> statement-breakpoint
ALTER TABLE `__new_books` RENAME TO `books`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_cards` (
	`id` text PRIMARY KEY NOT NULL,
	`book_id` text NOT NULL,
	`unit_index` integer NOT NULL,
	`state` integer DEFAULT 0 NOT NULL,
	`stability` real DEFAULT 0 NOT NULL,
	`difficulty` real DEFAULT 0 NOT NULL,
	`elapsed_days` integer DEFAULT 0 NOT NULL,
	`scheduled_days` integer DEFAULT 0 NOT NULL,
	`reps` integer DEFAULT 0 NOT NULL,
	`lapses` integer DEFAULT 0 NOT NULL,
	`due` integer DEFAULT strftime('%s','now') NOT NULL,
	`last_review` integer,
	`created_at` integer DEFAULT strftime('%s','now') NOT NULL,
	`photo_path` text,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_cards`("id", "book_id", "unit_index", "state", "stability", "difficulty", "elapsed_days", "scheduled_days", "reps", "lapses", "due", "last_review", "created_at", "photo_path") SELECT "id", "book_id", "unit_index", "state", "stability", "difficulty", "elapsed_days", "scheduled_days", "reps", "lapses", "due", "last_review", "created_at", "photo_path" FROM `cards`;--> statement-breakpoint
DROP TABLE `cards`;--> statement-breakpoint
ALTER TABLE `__new_cards` RENAME TO `cards`;--> statement-breakpoint
CREATE TABLE `__new_ledger` (
	`id` integer PRIMARY KEY NOT NULL,
	`date` integer NOT NULL,
	`earned_lex` integer DEFAULT 0 NOT NULL,
	`target_lex` integer DEFAULT 0 NOT NULL,
	`balance` integer DEFAULT 0 NOT NULL,
	`transaction_type` text DEFAULT 'daily',
	`note` text
);
--> statement-breakpoint
INSERT INTO `__new_ledger`("id", "date", "earned_lex", "target_lex", "balance", "transaction_type", "note") SELECT "id", "date", "earned_lex", "target_lex", "balance", "transaction_type", "note" FROM `ledger`;--> statement-breakpoint
DROP TABLE `ledger`;--> statement-breakpoint
ALTER TABLE `__new_ledger` RENAME TO `ledger`;--> statement-breakpoint
CREATE UNIQUE INDEX `ledger_date_unique` ON `ledger` (`date`);--> statement-breakpoint
CREATE TABLE `__new_velocity_measurements` (
	`date` text PRIMARY KEY NOT NULL,
	`earned_lex` integer DEFAULT 0 NOT NULL,
	`minutes_spent` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT strftime('%s','now') NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_velocity_measurements`("date", "earned_lex", "minutes_spent", "created_at") SELECT "date", "earned_lex", "minutes_spent", "created_at" FROM `velocity_measurements`;--> statement-breakpoint
DROP TABLE `velocity_measurements`;--> statement-breakpoint
ALTER TABLE `__new_velocity_measurements` RENAME TO `velocity_measurements`;