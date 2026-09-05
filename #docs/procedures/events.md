# Procedure: events

## Emitted in the transaction

```ts
await ctx.tx(async (inside) =>
{
    await inside.db.insert(orders).values(row);
    inside.events.emit("orders.placed", { id: row.id, ownerId: row.owner });
});
```

Held until the commit. What holds it is the open transaction, not the context
you called `emit` on: what escapes is an emit after it ends. Emitting belongs
to the service, not `plugin.ts`. `ctx.caller` is undefined in a listener, so
whose work it was travels in the payload.

## Delivery

Without an outbox an event lives only in memory: the process stops and the
listener is never called. `outbox: true` in `start` or `booting` writes each
event in the transaction that emitted it, delivers after the commit, forgets
only once a listener has heard it, and redelivers what was interrupted at the
next startup. Delivery is at least once: a writing listener ends with
`.onConflictDoNothing()`, keyed on the payload, not a new id.

## Hearing is not depending

A listener needs no `dependsOn`: an emitter does not know who listens, which
lets two plugins react to each other. But an event nobody declares does not
exist, so a test boots the emitter too: `booting({ plugins: [orders, ledger] })`. The boundary checker builds its graph from imports, tests included, so
that boot can be reported as a cycle though it is one on paper.

Your `listens` schema names the type you are handed, it does not check it. The
kernel checks the emitter's, so drift hands your handler a value that is not
what you said instead of refusing it. The emitter's `version` says it moved.

A listener runs after the caller, so `await api.settled()` before asserting.
One that throws reaches nobody, leaving the test green and the state wrong, so
assert `api.kernel.events.failures()` is empty.
