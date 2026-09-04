import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";

import type { photos } from "../tables/photos";
import type { products } from "../tables/products";

/** What `ctx.db` holds: this plugin's tables, and no others. */
export type Rows = BetterSQLite3Database<{ products: typeof products; photos: typeof photos }>;
