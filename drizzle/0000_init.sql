CREATE TABLE `app_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `build_mode_leftovers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`build_mode_id` integer NOT NULL,
	`part_num` text NOT NULL,
	`color_id` integer NOT NULL,
	`quantity` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `leftover_unique` ON `build_mode_leftovers` (`build_mode_id`,`part_num`,`color_id`);--> statement-breakpoint
CREATE TABLE `build_modes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`set_num` text NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `build_modes_set_idx` ON `build_modes` (`set_num`);--> statement-breakpoint
CREATE TABLE `catalog_colors` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`rgb` text NOT NULL,
	`is_trans` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `catalog_minifigs` (
	`fig_num` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`num_parts` integer DEFAULT 0 NOT NULL,
	`img_url` text
);
--> statement-breakpoint
CREATE TABLE `catalog_mocs` (
	`moc_num` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`year` integer,
	`num_parts` integer DEFAULT 0 NOT NULL,
	`img_url` text,
	`designer` text,
	`moc_url` text,
	`inventory_fetched_at` integer
);
--> statement-breakpoint
CREATE TABLE `catalog_part_categories` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `catalog_parts` (
	`part_num` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`part_cat_id` integer
);
--> statement-breakpoint
CREATE TABLE `catalog_sets` (
	`set_num` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`year` integer,
	`theme_id` integer,
	`subtheme` text,
	`num_parts` integer DEFAULT 0 NOT NULL,
	`img_url` text,
	`launch_date` text,
	`exit_date` text,
	`exit_date_manual` text,
	`brickset_checked_at` integer,
	`inventory_status` text DEFAULT 'none' NOT NULL,
	`alternates_fetched_at` integer
);
--> statement-breakpoint
CREATE INDEX `sets_theme_idx` ON `catalog_sets` (`theme_id`);--> statement-breakpoint
CREATE INDEX `sets_year_idx` ON `catalog_sets` (`year`);--> statement-breakpoint
CREATE INDEX `sets_name_idx` ON `catalog_sets` (`name`);--> statement-breakpoint
CREATE TABLE `catalog_themes` (
	`id` integer PRIMARY KEY NOT NULL,
	`parent_id` integer,
	`root_id` integer NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `themes_parent_idx` ON `catalog_themes` (`parent_id`);--> statement-breakpoint
CREATE INDEX `themes_root_idx` ON `catalog_themes` (`root_id`);--> statement-breakpoint
CREATE TABLE `custom_collection_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`collection_id` integer NOT NULL,
	`set_num` text,
	`fig_num` text
);
--> statement-breakpoint
CREATE INDEX `cci_collection_idx` ON `custom_collection_items` (`collection_id`);--> statement-breakpoint
CREATE TABLE `custom_collections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`cover_img` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `exchange_rates` (
	`currency` text PRIMARY KEY NOT NULL,
	`rate_try` real NOT NULL,
	`date` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `import_queue` (
	`theme_id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`priority` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`set_count` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `loose_parts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`part_num` text NOT NULL,
	`color_id` integer NOT NULL,
	`quantity` integer NOT NULL,
	`note` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `missing_parts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owned_set_id` integer NOT NULL,
	`part_num` text NOT NULL,
	`color_id` integer NOT NULL,
	`quantity` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `missing_unique` ON `missing_parts` (`owned_set_id`,`part_num`,`color_id`);--> statement-breakpoint
CREATE TABLE `moc_inventory` (
	`moc_num` text NOT NULL,
	`part_num` text NOT NULL,
	`color_id` integer NOT NULL,
	`quantity` integer NOT NULL,
	PRIMARY KEY(`moc_num`, `part_num`, `color_id`)
);
--> statement-breakpoint
CREATE TABLE `notification_log` (
	`key` text PRIMARY KEY NOT NULL,
	`sent_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `owned_minifigs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fig_num` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`note` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `owned_sets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`set_num` text NOT NULL,
	`acquired_at` text,
	`build_mode_id` integer,
	`status` text DEFAULT 'built' NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `owned_sets_set_idx` ON `owned_sets` (`set_num`);--> statement-breakpoint
CREATE TABLE `part_images` (
	`part_num` text NOT NULL,
	`color_id` integer NOT NULL,
	`img_url` text NOT NULL,
	PRIMARY KEY(`part_num`, `color_id`)
);
--> statement-breakpoint
CREATE TABLE `price_alerts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`type` text NOT NULL,
	`value` real,
	`last_notified_price` real
);
--> statement-breakpoint
CREATE TABLE `price_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`listing_id` integer NOT NULL,
	`price` real NOT NULL,
	`in_stock` integer DEFAULT true NOT NULL,
	`recorded_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `price_history_listing_idx` ON `price_history` (`listing_id`,`recorded_at`);--> statement-breakpoint
CREATE TABLE `product_listings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`site` text NOT NULL,
	`url` text NOT NULL,
	`currency` text DEFAULT 'TRY' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`last_checked_at` integer,
	`last_price` real,
	`last_in_stock` integer,
	`last_error` text
);
--> statement-breakpoint
CREATE INDEX `listings_product_idx` ON `product_listings` (`product_id`);--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`device_name` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `push_subscriptions_endpoint_unique` ON `push_subscriptions` (`endpoint`);--> statement-breakpoint
CREATE TABLE `set_alternates` (
	`set_num` text NOT NULL,
	`moc_num` text NOT NULL,
	PRIMARY KEY(`set_num`, `moc_num`)
);
--> statement-breakpoint
CREATE TABLE `set_inventory` (
	`set_num` text NOT NULL,
	`part_num` text NOT NULL,
	`color_id` integer NOT NULL,
	`is_spare` integer DEFAULT false NOT NULL,
	`quantity` integer NOT NULL,
	PRIMARY KEY(`set_num`, `part_num`, `color_id`, `is_spare`)
);
--> statement-breakpoint
CREATE TABLE `set_minifigs` (
	`set_num` text NOT NULL,
	`fig_num` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	PRIMARY KEY(`set_num`, `fig_num`)
);
--> statement-breakpoint
CREATE INDEX `set_minifigs_fig_idx` ON `set_minifigs` (`fig_num`);--> statement-breakpoint
CREATE TABLE `tracked_products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`img_url` text,
	`set_num` text,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `wishlist` (
	`set_num` text PRIMARY KEY NOT NULL,
	`priority` integer DEFAULT 3 NOT NULL,
	`note` text,
	`added_at` integer DEFAULT (unixepoch()) NOT NULL
);
