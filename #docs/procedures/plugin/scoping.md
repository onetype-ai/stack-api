# Procedure: whose rows

A permission says what a caller may do, never which rows are theirs. When the
answer is one column on every table, declare it once.

This is not a mechanical guarantee. The kit writes the condition; nothing
refuses a query that forgets to call it. `ctx.db` is the other guarantee, and
it does refuse another plugin's table at compile time. Do not confuse them.

## Declaring

```ts
scope: {
    describe: "The account a row belongs to.",
    claim: "tenantId",
    tables: { accounts: "tenantId", usage: "tenantId" },
},
```

Any declared column works, the primary key included: a tenants table scoped on
its own `id` is usual. Startup refuses a scope naming a table the plugin does
not own, or none at all.

## Three ways in

```
Request:       scoped / stamped, the claim decides.
Listener:      forScope, the payload carries the scope.
Public route:  scoped and stamped are 403. forScope WORKS.
```

The test is the caller, never the route. `forScope` throws only when
`ctx.caller` exists, so a public route, a listener and a command all take it.

It is a knife: an unknown caller then chooses whose rows they land in. Use it
where the action proves identity, signing in may, registering may not, and
never let the body name the scope.

## Reading and writing

```ts
.where(and(eq(items.id, id), ctx.scoped("items")))
.values({ ...row, ...ctx.stamped("items") })
```

`ctx.scoped` answers the condition for the table you name. Each has its own:
one table's against another asks for a column that is not there. Spread
`stamped` last, or a caller writes a row into somebody else's scope. No claim
is 403, never a default.

## Rules

- One claim per plugin. Two scopes is two plugins.
- A raw statement narrows itself.
- Every scoped read is tested with a stranger's id.
