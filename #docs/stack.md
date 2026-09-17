# Stack

Node 22+, TypeScript strict with `noUncheckedIndexedAccess` and
`exactOptionalPropertyTypes`. Hono, SQLite with Drizzle, Zod, Vitest, ESLint.

One package from npm, `@onetype/stack-api-kit`, and nothing else shared. It
has a second entry, `./testing`, for what a test uses.

## Running it

```
pnpm dev       watch, on http://localhost:7280
pnpm start     once
pnpm verify    lint, typecheck, tests
```

`PORT` moves it, `ORIGINS` names who may call it from a browser.

## What verify checks that the compiler cannot

`Project.findAll` reads the source and answers what no type can see. One test
runs it, so a build fails on what boot would not:

```ts
import { expect, test } from "vitest";
import { Project } from "@onetype/stack-api-kit/testing";

test("the project holds its own boundaries", () =>
{
    expect(Project.findAll()).toEqual([]);
});
```

It names a plugin importing another's internals, a declared field nothing
reads, a document over its size, a plugin with no `usage.md` — and the one the
compiler will never catch:

```
[unscoped] notes/services/notes.ts: queries "notes", which "notes" scopes, and
narrows by nothing. Every tenant's rows answer. Pass ctx.scoped("notes") to
where, or ctx.forScope(claim) for a caller the request does not name.
```

A scoped read that forgets to narrow compiles, boots, serves, and returns every
tenant's rows. This test is what catches it. Write it first.

## Startup

The database opens, migrations run in dependency order, every contract is
validated, `setup` runs, and the routes mount. Any failure stops the boot
naming the plugin and the cause: nothing partially starts.

## Fault codes, by when they fire

A `KernelFault` carries a `code`. Every message names the plugin, the thing and
the fix, so this is a map of when to expect which, not a substitute for reading
one.

**At boot, from a contract that does not hold.** `DUPLICATE_PLUGIN`,
`UNKNOWN_DEPENDENCY`, `DEPENDENCY_CYCLE`, `INVALID_NAME`, `INVALID_CONFIG`,
`INVALID_ROUTE`, `INVALID_OUTPUT`, `DUPLICATE_TABLE`, `DUPLICATE_ROUTE`,
`DUPLICATE_CHANNEL`, `DUPLICATE_EVENT`, `DUPLICATE_HOOK`, `DUPLICATE_COMMAND`,
`DUPLICATE_PERMISSION` and `DUPLICATE_GRANTS` — each meaning two plugins claim
one name, so which answers would depend on the order they booted.
`UNGRANTABLE_PERMISSION` means a route asks for something no plugin grants, so
nobody could ever reach it.

**At boot, from one plugin naming another's.** `UNDECLARED_CHANNEL`,
`UNDECLARED_EVENT`, `UNDECLARED_HOOK`, `UNDECLARED_COMMAND`,
`UNDECLARED_PERMISSION`, `UNDECLARED_SCOPE`, `UNDECLARED_HOST`,
`UNDECLARED_DEPENDENCY`. Each says which plugin owns what you reached for.
`SELF_HEARD_EVENT` is the opposite mistake: a plugin never hears its own.

**On a request, about who is calling.** `UNAUTHENTICATED` is nobody,
`PERMISSION_DENIED` is somebody holding too little, `RATE_LIMITED` is somebody
too often. `UNCLAIMED_SCOPE` is a caller whose identity carries no claim the
scope reads; `OUT_OF_SCOPE` is one reaching another tenant's rows;
`UNSCOPED_CALLER` is a scoped read where nobody is calling at all, which is
what a scheduled run is — use `ctx.forScope(claim)` there.

**On a request, about what was sent.** `INVALID_PAYLOAD` failed the schema;
`WRONG_PAYLOAD` matched a different one than the name promised.

**What the caller sees, which is not the same list.** A `KernelFault` never
crosses the wire. A body carries a `Refusal`'s code: `INVALID_INPUT` with a
`fields` map when the route's input schema refused it, `UNAUTHENTICATED`,
`PERMISSION_DENIED`, `RATE_LIMITED`, `OUT_OF_SCOPE` — and `INTERNAL` for
everything else, so a contract mistake of yours tells an attacker nothing. Read
the log for which one it was.

**On a request, about when.** `NOT_STARTED` is a command run before `setup`
finished, or after `stop`. `UNKEPT_EVENT` is an emit outside `ctx.tx` while an
outbox is configured: nothing would keep it if a listener failed.
