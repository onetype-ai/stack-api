import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";

import type { photos } from "../tables/photos";
import type { products } from "../tables/products";

export type Rows = BetterSQLite3Database<{ products: typeof products; photos: typeof photos }>;
