CREATE TABLE `velocity_measurements` (
	`date` text PRIMARY KEY NOT NULL,
	`earned_lex` integer DEFAULT 0 NOT NULL,
	`minutes_spent` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
