CREATE TABLE catalog_photos (
    id         TEXT PRIMARY KEY,
    shop_id    TEXT NOT NULL,
    product_id TEXT NOT NULL,
    url        TEXT NOT NULL,
    position   INTEGER NOT NULL
);

CREATE INDEX catalog_photos_product ON catalog_photos (shop_id, product_id, position);
