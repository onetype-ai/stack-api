import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const products = sqliteTable("catalog_products", {
    id: text("id").primaryKey(),

    /** Which shop this belongs to. Every read narrows on it. */
    shopId: text("shop_id").notNull(),

    name: text("name").notNull(),

    /** The name with accents removed, so a search for Uber finds Über. */
    searched: text("searched").notNull(),

    /** The name with accents kept, so Apfel and Äpfel are two products. */
    same: text("same").notNull(),

    /** Minor units. A price that rounds is a price that overcharges. */
    cents: integer("cents").notNull(),

    status: text("status").notNull(),
    createdAt: text("created_at").notNull(),

    /** What "newest first" sorts on. A timestamp ties within a millisecond. */
    sequence: integer("sequence").notNull(),
}, (table) => [
    index("catalog_products_shop").on(table.shopId, table.sequence),
    uniqueIndex("catalog_products_named").on(table.shopId, table.same),
]);
