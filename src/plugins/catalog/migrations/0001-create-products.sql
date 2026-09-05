CREATE TABLE catalog_products (
    id         TEXT PRIMARY KEY,
    shop_id    TEXT NOT NULL,
    name       TEXT NOT NULL,
    searched   TEXT NOT NULL,
    same       TEXT NOT NULL,
    cents      INTEGER NOT NULL CHECK (cents >= 0),
    status     TEXT NOT NULL,
    created_at TEXT NOT NULL,
    sequence   INTEGER NOT NULL
);

CREATE INDEX catalog_products_shop ON catalog_products (shop_id, sequence);

-- Two products in one shop cannot share a name, whatever case or accent the
-- input played with: the folded form is what collides.
CREATE UNIQUE INDEX catalog_products_named ON catalog_products (shop_id, same);
