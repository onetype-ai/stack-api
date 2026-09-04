CREATE TABLE orders_orders (
    id          TEXT PRIMARY KEY,
    shop_id     TEXT NOT NULL,
    product_id  TEXT NOT NULL,
    cents       INTEGER NOT NULL CHECK (cents >= 0),
    status      TEXT NOT NULL,
    holds_until INTEGER NOT NULL,
    created_at  TEXT NOT NULL,
    sequence    INTEGER NOT NULL
);

CREATE INDEX orders_orders_shop ON orders_orders (shop_id, sequence);
