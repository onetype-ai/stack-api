# Procedure: storage

A plugin reads its own tables and no others: `ctx.db` carries nothing else, so
a query naming another plugin's table does not compile.

## One writer

The kit serialises every write, so a query issued while another request's
transaction waits on an await cannot join it and vanish with its rollback.
That is why `ctx.write` exists: reads are safe without it, a write is not.

A transaction holds the writer while it runs and everything else waits.

## A timestamp is not an order

Milliseconds tie. Take the number yourself, in the transaction that writes:

```ts
const [highest] = await inside.db.select({ at: max(notices.sequence) })
    .from(notices).where(eq(notices.ownerId, owner));

await inside.db.insert(notices).values({ ...row, sequence: (highest?.at ?? 0) + 1 });
```

That number is the cursor a page walks, indexed with the scope column first.
No offsets, and no stored counter: `COUNT(*)`.

## A migration is history

`NNNN-name.sql`, run once in dependency order and recorded. Editing one that
already ran refuses at startup: add a new file instead.

## Rules

- A write goes through `ctx.write` or `ctx.tx`, never a bare query.
- Anything touching more than one row, or emitting, is one `ctx.tx`.
- Inside `tx`, use the context it hands you, not the outer one.
- Keep a transaction short; never await a network inside one.
