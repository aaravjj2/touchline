CREATE TABLE `duel_presence` (
	`code` text NOT NULL,
	`seat` integer NOT NULL,
	`seen` integer NOT NULL,
	PRIMARY KEY(`code`, `seat`)
);
--> statement-breakpoint
CREATE TABLE `duel_rates` (
	`key` text PRIMARY KEY NOT NULL,
	`window` integer NOT NULL,
	`hits` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `duel_rooms` (
	`code` text PRIMARY KEY NOT NULL,
	`state` text NOT NULL,
	`revision` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `duel_room_expiry` ON `duel_rooms` (`expires_at`);