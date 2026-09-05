# orders

## Description

Holding a product until somebody pays. The second plugin: what `catalog` shows
alone, this shows across a boundary and across time.

## Usage

```ts
import { Orders } from "@plugins/orders";

const order = await Orders.reserve(ctx, productId);
```

`orders.read` lists; `orders.write` holds, pays and cancels. Every route
answers only the caller's shop.

## What it demonstrates

- **dependsOn** — `catalog` is declared, so `Catalog.get` is reachable. The
  price comes from the plugin that owns it, never from the caller.
- **commands.later** — a hold is released by a command asked for inside the
  transaction that made it, so a reservation that rolled back releases
  nothing. Expiry is a moment on the row that reads ignore.
- **owns** — a counter built once in `setup` and read in `teardown`. A
  service is made per request, so one counting there counts to one every time.
  It holds no secret: what signs a call is added by the project's dialler,
  because a key a plugin can read is a key its config can log.
- **listens** — a product removed lets go of every hold on it.
- **participates** — a product priced at nothing is refused, from another
  plugin's hook.
- **outbound** — `ctx.fetch` carries the charge, refusing any host this
  plugin did not declare. Dialled outside the transaction: holding SQLite's
  one writer while somebody else's server thinks would stop every write.
- **Their answer is input** — parsed with a schema, never believed.

## Refuses

- No caller id: 401. A missing permission: 403, naming none.
- No shop on the caller: 403, never a default shop.
- Another shop's order: 404, as for one that never existed.
- A product not listed: 409. A hold already gone: 409.
- A payment the partner refused: 402, and the order stays held.
- An answer from them we cannot read: 502.
