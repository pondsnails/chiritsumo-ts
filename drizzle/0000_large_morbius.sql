CREATE TABLE `books` (
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
	`target_completion_date` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `cards` (
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
	`due` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_review` text,
	`photo_path` text,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `inventory_presets` (
	`id` integer PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`icon_code` integer DEFAULT 0 NOT NULL,
	`is_default` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ledger` (
	`id` integer PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`earned_lex` integer DEFAULT 0 NOT NULL,
	`target_lex` integer DEFAULT 0 NOT NULL,
	`balance` integer DEFAULT 0 NOT NULL,
	`transaction_type` text DEFAULT 'daily',
	`note` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ledger_date_unique` ON `ledger` (`date`);--> statement-breakpoint
CREATE TABLE `preset_books` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`preset_id` integer NOT NULL,
	`book_id` text NOT NULL,
	FOREIGN KEY (`preset_id`) REFERENCES `inventory_presets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `system_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
