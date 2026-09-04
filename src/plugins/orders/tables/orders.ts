import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const orders = sqliteTable("orders_orders", {
    id: text("id").primaryKey(),
    shopId: text("shop_id").notNull(),
    productId: text("product_id").notNull(),
    cents: integer("cents").notNull(),
    status: text("status").notNull(),

    /** When a reservation stops being one. Read, never waited on. */
    holdsUntil: integer("holds_until").notNull(),

    createdAt: text("created_at").notNull(),
    sequence: integer("sequence").notNull(),
}, (table) => [
    index("orders_orders_shop").on(table.shopId, table.sequence),
]);
