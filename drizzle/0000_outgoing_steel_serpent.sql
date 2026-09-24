CREATE TABLE `listings` (
	`id` text PRIMARY KEY NOT NULL,
	`store_id` text NOT NULL,
	`brand` text NOT NULL,
	`model` text NOT NULL,
	`storage` text NOT NULL,
	`color` text NOT NULL,
	`price` integer NOT NULL,
	`battery` integer,
	`condition` text NOT NULL,
	`warranty` text NOT NULL,
	`description` text NOT NULL,
	`images` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created` text NOT NULL,
	`updated` text NOT NULL,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_listings_store` ON `listings` (`store_id`);--> statement-breakpoint
CREATE INDEX `idx_listings_status_brand` ON `listings` (`status`,`brand`);--> statement-breakpoint
CREATE TABLE `stores` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`city` text NOT NULL,
	`address` text NOT NULL,
	`phone` text NOT NULL,
	`line` text DEFAULT '' NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stores_owner_unique` ON `stores` (`owner`);