import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * A product's pictures. A second table, so the plugin shows what one cannot:
 * every scoped table carries the claim in its own column, and a query narrows
 * on the table it is reading.
 */
export const photos = sqliteTable("catalog_photos", {
    id: text("id").primaryKey(),

    /** Its own, not the product's. A join is not a scope. */
    shopId: text("shop_id").notNull(),

    productId: text("product_id").notNull(),
    url: text("url").notNull(),
    position: integer("position").notNull(),
}, (table) => [
    index("catalog_photos_product").on(table.shopId, table.productId, table.position),
]);
