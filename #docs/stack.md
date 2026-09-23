# Stack

Node 22+, TypeScript strict with `noUncheckedIndexedAccess` and
`exactOptionalPropertyTypes`. Hono, SQLite with Drizzle, Zod, Vitest, ESLint.

One package, `@onetype/stack-api-kit`, with a second entry `./testing`.
`schemas.md` is its full surface, generated from the published types.

## What the kit is for

A capability is a plugin. A plugin declares what crosses its boundary —
routes, tables, events, permissions, the hosts it may reach — and the kernel
refuses at startup anything a contract did not declare. Nothing partially
starts.

Two plugins reach each other only through `index.ts`, and only where
`dependsOn` names the other.

## What verify catches that the compiler cannot

`Project.findAll()` reads the source. One test runs it, and the most valuable
thing it answers is a scoped read that narrows by nothing:

```
[unscoped] items/services/items.ts: queries "items", which "items" scopes,
and narrows by nothing. Every tenant's rows answer.
```

That compiles, boots, serves, and returns every tenant's rows. It also names a
plugin importing another's internals, a declared field nothing reads, a
document over its size, and a plugin with no `usage.md`.

## Errors

A `KernelFault` is a contract mistake and never crosses the wire; a `Refusal`
is what a caller gets. Every fault message names the plugin, the thing and the
fix, so read the one you get rather than a list of them here. Anything
unexpected answers `INTERNAL`, so a mistake of yours tells an attacker
nothing — the log carries which it was.
