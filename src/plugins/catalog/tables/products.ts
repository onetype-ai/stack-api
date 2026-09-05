import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const products = sqliteTable("catalog_products", {
    id: text("id").primaryKey(),

    shopId: text("shop_id").notNull(),

    name: text("name").notNull(),

    searched: text("searched").notNull(),

    same: text("same").notNull(),

    cents: integer("cents").notNull(),

    status: text("status").notNull(),
    createdAt: text("created_at").notNull(),

    sequence: integer("sequence").notNull(),
}, (table) => [
    index("catalog_products_shop").on(table.shopId, table.sequence),
    uniqueIndex("catalog_products_named").on(table.shopId, table.same),
]);
