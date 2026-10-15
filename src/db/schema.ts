import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const now = sql`(unixepoch())`;

/* ------------------------------------------------------------------ */
/* Catalog cache (Rebrickable CSV / API, Brickset)                     */
/* ------------------------------------------------------------------ */

export const catalogThemes = sqliteTable(
  "catalog_themes",
  {
    id: integer("id").primaryKey(),
    parentId: integer("parent_id"),
    rootId: integer("root_id").notNull(),
    name: text("name").notNull(),
  },
  (t) => [index("themes_parent_idx").on(t.parentId), index("themes_root_idx").on(t.rootId)],
);

export const catalogSets = sqliteTable(
  "catalog_sets",
  {
    setNum: text("set_num").primaryKey(),
    name: text("name").notNull(),
    year: integer("year"),
    themeId: integer("theme_id"),
    subtheme: text("subtheme"),
    numParts: integer("num_parts").notNull().default(0),
    imgUrl: text("img_url"),
    launchDate: text("launch_date"),
    exitDate: text("exit_date"),
    exitDateManual: text("exit_date_manual"),
    bricksetCheckedAt: integer("brickset_checked_at"),
    /** none | csv | api — where the parts inventory came from */
    inventoryStatus: text("inventory_status").notNull().default("none"),
    alternatesFetchedAt: integer("alternates_fetched_at"),
  },
  (t) => [
    index("sets_theme_idx").on(t.themeId),
    index("sets_year_idx").on(t.year),
    index("sets_name_idx").on(t.name),
  ],
);

export const catalogMinifigs = sqliteTable("catalog_minifigs", {
  figNum: text("fig_num").primaryKey(),
  name: text("name").notNull(),
  numParts: integer("num_parts").notNull().default(0),
  imgUrl: text("img_url"),
});

export const setMinifigs = sqliteTable(
  "set_minifigs",
  {
    setNum: text("set_num").notNull(),
    figNum: text("fig_num").notNull(),
    quantity: integer("quantity").notNull().default(1),
  },
  (t) => [primaryKey({ columns: [t.setNum, t.figNum] }), index("set_minifigs_fig_idx").on(t.figNum)],
);

export const catalogPartCategories = sqliteTable("catalog_part_categories", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
});

export const catalogParts = sqliteTable("catalog_parts", {
  partNum: text("part_num").primaryKey(),
  name: text("name").notNull(),
  partCatId: integer("part_cat_id"),
});

export const catalogColors = sqliteTable("catalog_colors", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  rgb: text("rgb").notNull(),
  isTrans: integer("is_trans", { mode: "boolean" }).notNull().default(false),
});

/** Image per part+color. Stored as path relative to https://cdn.rebrickable.com/media/ when possible. */
export const partImages = sqliteTable(
  "part_images",
  {
    partNum: text("part_num").notNull(),
    colorId: integer("color_id").notNull(),
    imgUrl: text("img_url").notNull(),
  },
  (t) => [primaryKey({ columns: [t.partNum, t.colorId] })],
);

export const setInventory = sqliteTable(
  "set_inventory",
  {
    setNum: text("set_num").notNull(),
    partNum: text("part_num").notNull(),
    colorId: integer("color_id").notNull(),
    isSpare: integer("is_spare", { mode: "boolean" }).notNull().default(false),
    quantity: integer("quantity").notNull(),
  },
  (t) => [primaryKey({ columns: [t.setNum, t.partNum, t.colorId, t.isSpare] })],
);

export const catalogMocs = sqliteTable("catalog_mocs", {
  mocNum: text("moc_num").primaryKey(),
  name: text("name").notNull(),
  year: integer("year"),
  numParts: integer("num_parts").notNull().default(0),
  imgUrl: text("img_url"),
  designer: text("designer"),
  mocUrl: text("moc_url"),
  inventoryFetchedAt: integer("inventory_fetched_at"),
});

export const setAlternates = sqliteTable(
  "set_alternates",
  {
    setNum: text("set_num").notNull(),
    mocNum: text("moc_num").notNull(),
  },
  (t) => [primaryKey({ columns: [t.setNum, t.mocNum] })],
);

export const mocInventory = sqliteTable(
  "moc_inventory",
  {
    mocNum: text("moc_num").notNull(),
    partNum: text("part_num").notNull(),
    colorId: integer("color_id").notNull(),
    quantity: integer("quantity").notNull(),
  },
  (t) => [primaryKey({ columns: [t.mocNum, t.partNum, t.colorId] })],
);

export const importQueue = sqliteTable("import_queue", {
  themeId: integer("theme_id").primaryKey(),
  name: text("name").notNull(),
  priority: integer("priority").notNull(),
  /** pending | done | error */
  status: text("status").notNull().default("pending"),
  setCount: integer("set_count").notNull().default(0),
  lastError: text("last_error"),
  updatedAt: integer("updated_at").notNull().default(now),
});

export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at").notNull().default(now),
});

/* ------------------------------------------------------------------ */
/* User data                                                           */
/* ------------------------------------------------------------------ */

export const ownedSets = sqliteTable(
  "owned_sets",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    setNum: text("set_num").notNull(),
    acquiredAt: text("acquired_at"),
    buildModeId: integer("build_mode_id"),
    /** sealed | built | disassembled */
    status: text("status").notNull().default("built"),
    notes: text("notes"),
    createdAt: integer("created_at").notNull().default(now),
  },
  (t) => [index("owned_sets_set_idx").on(t.setNum)],
);

export const missingParts = sqliteTable(
  "missing_parts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ownedSetId: integer("owned_set_id").notNull(),
    partNum: text("part_num").notNull(),
    colorId: integer("color_id").notNull(),
    quantity: integer("quantity").notNull(),
  },
  (t) => [uniqueIndex("missing_unique").on(t.ownedSetId, t.partNum, t.colorId)],
);

export const looseParts = sqliteTable("loose_parts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  partNum: text("part_num").notNull(),
  colorId: integer("color_id").notNull(),
  quantity: integer("quantity").notNull(),
  note: text("note"),
  createdAt: integer("created_at").notNull().default(now),
});

export const buildModes = sqliteTable(
  "build_modes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    setNum: text("set_num").notNull(),
    name: text("name").notNull(),
  },
  (t) => [index("build_modes_set_idx").on(t.setNum)],
);

export const buildModeLeftovers = sqliteTable(
  "build_mode_leftovers",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    buildModeId: integer("build_mode_id").notNull(),
    partNum: text("part_num").notNull(),
    colorId: integer("color_id").notNull(),
    quantity: integer("quantity").notNull(),
  },
  (t) => [uniqueIndex("leftover_unique").on(t.buildModeId, t.partNum, t.colorId)],
);

export const wishlist = sqliteTable("wishlist", {
  setNum: text("set_num").primaryKey(),
  /** 1 (highest) – 5 (lowest) */
  priority: integer("priority").notNull().default(3),
  note: text("note"),
  addedAt: integer("added_at").notNull().default(now),
});

export const customCollections = sqliteTable("custom_collections", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  coverImg: text("cover_img"),
  createdAt: integer("created_at").notNull().default(now),
});

export const customCollectionItems = sqliteTable(
  "custom_collection_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    collectionId: integer("collection_id").notNull(),
    setNum: text("set_num"),
    figNum: text("fig_num"),
  },
  (t) => [index("cci_collection_idx").on(t.collectionId)],
);

/** Minifigures owned independently of a set (e.g. opened CMF packs). */
export const ownedMinifigs = sqliteTable("owned_minifigs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  figNum: text("fig_num").notNull(),
  quantity: integer("quantity").notNull().default(1),
  note: text("note"),
  createdAt: integer("created_at").notNull().default(now),
});

export const notificationLog = sqliteTable("notification_log", {
  key: text("key").primaryKey(),
  sentAt: integer("sent_at").notNull().default(now),
});

/* ------------------------------------------------------------------ */
/* Phase 2: price tracking                                             */
/* ------------------------------------------------------------------ */

export const trackedProducts = sqliteTable("tracked_products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  imgUrl: text("img_url"),
  setNum: text("set_num"),
  notes: text("notes"),
  createdAt: integer("created_at").notNull().default(now),
});

export const productListings = sqliteTable(
  "product_listings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    productId: integer("product_id").notNull(),
    site: text("site").notNull(),
    url: text("url").notNull(),
    currency: text("currency").notNull().default("TRY"),
    /** active | error */
    status: text("status").notNull().default("active"),
    lastCheckedAt: integer("last_checked_at"),
    lastPrice: real("last_price"),
    lastInStock: integer("last_in_stock", { mode: "boolean" }),
    lastError: text("last_error"),
  },
  (t) => [index("listings_product_idx").on(t.productId)],
);

export const priceHistory = sqliteTable(
  "price_history",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    listingId: integer("listing_id").notNull(),
    price: real("price").notNull(),
    inStock: integer("in_stock", { mode: "boolean" }).notNull().default(true),
    recordedAt: integer("recorded_at").notNull().default(now),
  },
  (t) => [index("price_history_listing_idx").on(t.listingId, t.recordedAt)],
);

export const priceAlerts = sqliteTable("price_alerts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id").notNull(),
  /** any_drop | below | percent | all_time_low */
  type: text("type").notNull(),
  value: real("value"),
  lastNotifiedPrice: real("last_notified_price"),
});

export const pushSubscriptions = sqliteTable("push_subscriptions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  deviceName: text("device_name"),
  createdAt: integer("created_at").notNull().default(now),
});

export const exchangeRates = sqliteTable("exchange_rates", {
  currency: text("currency").primaryKey(),
  /** 1 unit of currency in TRY */
  rateTry: real("rate_try").notNull(),
  date: text("date").notNull(),
});
