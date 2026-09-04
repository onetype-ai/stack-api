import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const photos = sqliteTable("catalog_photos", {
    id: text("id").primaryKey(),

    shopId: text("shop_id").notNull(),

    productId: text("product_id").notNull(),
    url: text("url").notNull(),
    position: integer("position").notNull(),
}, (table) => [
    index("catalog_photos_product").on(table.shopId, table.productId, table.position),
]);
