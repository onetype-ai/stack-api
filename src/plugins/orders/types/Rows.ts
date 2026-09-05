import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";

import type { orders } from "../tables/orders";

export type Rows = BetterSQLite3Database<{ orders: typeof orders }>;
