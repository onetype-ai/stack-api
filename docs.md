# #docs packed

Every file of these documents, one after another. A line starting
with "==> " opens a file and names its path; everything until the next
such line is that file, byte for byte.

Rebuild it with:     node tools/pack/docs.mjs unpack
Rewrite this with:   node tools/pack/docs.mjs pack

==> #docs/usage.md

# api

## Running

```sh
pnpm install
pnpm dev              # http://localhost:3000
pnpm verify           # lint, typecheck, test
```

`PORT`, `DATABASE_FILE`, `ORIGINS`, `BODY_BYTES`, `LOG_LEVEL`, `OUTBOX`,
`SCHEDULE`, `BEHIND_PROXY` and `WATCH_SECONDS` configure it. Everything defaults except
`ORIGINS`, which is empty: no browser origin is allowed until one is named.

`BEHIND_PROXY` reads `x-forwarded-for` as the rate limit's key. On without a
proxy, a caller invents a new key per request.

## Adding a plugin

Create `src/plugins/<name>/plugin.ts` and export a `definePlugin` result.

```ts
export default definePlugin.over<BillingDb, Services>()("billing", {
    version: "1.0.0",
    describe: "Invoices and payment methods.",
    dependsOn: ["auth"],
    tables: { invoices },
    migrations: "./src/plugins/billing/migrations",
    permissions: { "billing.read": { describe: "See invoices." } },
    services: (ctx) => ({ invoices: new Invoices(ctx) }),
    routes: [...invoiceRoutes],
});
```

`over` names what `ctx.db` and `ctx.services` are. A plugin holding no tables
writes `definePlugin(name, …)` instead.

## Using another plugin

```ts
import { Auth } from "@plugins/auth";
```

A plugin's `index.ts` is the only file another may import, and the plugin must
be in `dependsOn`. Anything deeper is rejected by lint.

`reference.md` holds every signature; `#docs/procedures/` how to build each
part.

==> #docs/architecture.md

# Architecture

## One capability, one plugin

A plugin knows the domain, a package does not. New technology is a new plugin,
never a branch inside an old one.

## Three ways to cross

- **Public API** for a result now, from a plugin in `dependsOn`. Methods take
  `ctx`, so they run anywhere `ctx` does.
- **Events** to announce what happened. Nothing comes back, nobody waits.
- **Hooks** to let a participant refuse. One refuses by returning a reason;
  throwing or never answering refuses too. Participating in your own hook is
  an `if` written the hard way.

Refuses:

- Request and response over the event bus.
- A method emitting through someone else's `ctx`: an event carries the
  identity of the context it went through. Emitting belongs to the service.
- A table crossing. Data crosses as a return value or an event's payload.

## The server decides

The client hides, the server refuses. Every route parses its input and filters
its output.

## Failure is contained

A route that throws answers 500 and logs everything. A listener that throws
reaches neither the emitter nor the others, so nothing marks it but
`kernel.events.failures()`.

## Code is the authority

Plugins are discovered from the folder, not a list. A cross-plugin import is
checked against `dependsOn`, so an undeclared one fails.

==> #docs/procedures/checks.md

# Procedure: what the project refuses

One test runs over the whole repository. Each check fails the build, answering
`{ check, message }` naming the file.

## A boundary crossed undeclared

An import of another plugin that `dependsOn` does not name, or one reaching
past its `index.ts`.

A test may name `@plugins/<other>/plugin`, the contract itself, for anything
it has to boot. Nothing deeper, and production code gets no exemption.

## A field nothing reads

An exported type declaring a field no production file in its own plugin reads.
A field for later is not a field yet.

## A folder with no contract

A directory under `src/plugins/` with no `plugin.ts`.

## A document that outgrew its point

Anything under `#docs/` over 1800 characters, and any plugin with no
`usage.md`. Every key the contract accepts must be named in
`procedures/plugin/contract.md`.

## What it does not look at

- **Only exported types.** An unexported one, a comment, or a test reading the
  field does not count, and only the declaring plugin is searched.
- **Only `#docs/`.** The size limit never reaches a plugin's own `usage.md`.
  Hold that limit yourself.
- The `progress` folder is skipped, and `checking.limit` moves the number.
- `src/utils` is checked for unread fields too, not only `src/plugins`.
- Lint refuses a util, in `src/utils` or a plugin's own, that imports a plugin
  or the kit: wanting a `ctx` makes it a service.

==> #docs/procedures/deploy.md

# Procedure: the composition root and the deployment

`main.ts` holds every plugin at once. Nobody imports it, so what it may reach,
nothing else may. Signatures are in `reference.md`.

## What is running

```ts
type Registration = {
    plugin: string; method: Method; path: string; describe: string;
    requires: readonly string[]; public: boolean;
    limit: { requests: number; seconds: number } | undefined;
    reads: readonly string[];
};
```

`kernel.routes()` answers these. Assert which routes are public, that every
closed one carries a budget, and that no `reads` names a credential header. A
route opened by accident then fails a test, not a review.

## Secrets

`config` is validated and logged at startup, so nothing secret goes in it. A
credential is read from the environment here and passed in as a value:
`identify` takes the session store, `dial` the headers it sends.

## Logging

A 5xx carries the request id, the plugin, the message and the stack; a 4xx
does not.

The kit logs, it does not notify. A failed listener has nobody waiting on it,
so the root polls `kernel.events.failures()` every `WATCH_SECONDS` and warns
once per failure. Warn, never 503: one undelivered email is not a dead
process.

## Health

`/live` answers before the kernel starts. `/ready` is 503 until migrations ran
and plugins are up, and again while stopping.

## Refuses

- A secret in `config`, or read from the environment inside a plugin.
- A log line carrying a body, a token, or an undeclared header.
- A driver that is not a peer dependency, so a second copy exists.

==> #docs/procedures/events.md

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
listener is never called. `outbox: true` in `start` or `startTestKernel` writes each
event in the transaction that emitted it, delivers after the commit, forgets
only once a listener has heard it, and redelivers what was interrupted at the
next startup. Delivery is at least once: a writing listener ends with
`.onConflictDoNothing()`, keyed on the payload, not a new id.

## Hearing is not depending

A listener needs no `dependsOn`: an emitter does not know who listens, which
lets two plugins react to each other. But an event nobody declares does not
exist, so a test boots the emitter too. The boundary checker builds its graph from imports, tests included, so
that boot can be reported as a cycle though it is one on paper.

Your `listens` schema names the type you are handed, it does not check it. The
kernel checks the emitter's, so drift hands your handler a value that is not
what you said instead of refusing it. The emitter's `version` says it moved.

A listener runs after the caller, so `await api.settled()` before asserting.
One that throws reaches nobody, leaving the test green and the state wrong, so
assert `api.kernel.events.failures()` is empty.

==> #docs/procedures/later.md

# Procedure: work that happens later

## Asking

```ts
await ctx.tx(async (inside) =>
{
    await inside.db.insert(holds).values(row);

    inside.commands.later("bookings.release-hold", { id: row.id }, 600);
});
```

`later(name, input, seconds)`. Only a command your own plugin declares, and
only when `start` was given `schedule: true`. Asked inside a transaction it is
written by that transaction, so work scheduled by something that rolled back
never runs.

## No caller, and it may run twice

`ctx.caller` is undefined, so whose work this is travels in the input. A
scheduled command declares no `requires`: no permission can be granted to
nobody.

An attempt that throws goes back, counted, waiting longer each time up to a
minute, then is abandoned with a log line. Key what it writes on the input.

## Repeating

There is no `every`. Work that repeats asks for itself again as it ends, so a
failing run cannot pile a second copy behind the first:

```ts
ctx.commands.later("items.sweep", {}, 3600);
```

Ask only while something waits. A fixed number of times carries the count in
the input, so it survives a restart. There is no cron syntax and the kit has
no timezone: for an hour each day you work out the seconds yourself.

## Expiry is a read, not an event

A hold past its moment is one your reads ignore; the command only tidies up.

==> #docs/procedures/naming.md

# Procedure: naming

A name is a part of speech, not a suffix. A type or a variable is a noun or an
adjective; a function is a verb.

## The test

Put **the** in front and see if you get a thing. Put **is** in front and see if
you get a state. If neither works, and the word only fits after **currently**,
it is a verb doing a noun's job.

```
the encoding, the mapping, the settings      a thing
is pending, is expired, is reserved          a state
currently looking, currently booting         a verb: rename it
```

So `encoding`, `mapping`, `pending` and `expired` are good names and `looking`,
`booting` and `holding` are not, though they look alike. `-ing` is not the
problem: `looking` is.

## When a name will not come

A name that will not come is usually missing a word from the domain, not a
synonym. `looking` holds a `query`. `holding` returns the `matches`.

If no word fits, the thing does more than one job. That is a design finding,
not a naming one.

## Functions

Imperative: `reserve`, `withdraw`, `findExpired`. A reader takes the name of
what it returns, without `get`: `failures()`, not `getFailures()`. A predicate
reads as a question: `isPaid()`.

## Length

As long as the distance it travels. `id` inside three lines is clear; the same
name across a file is not. A name is too short when the reader has to look up
to know what it holds, and too long when it repeats the type.

## Refuses

- `Manager`, `Handler`, `Helper`, `Util`, `Service`, `Data`, `Info`: they say
  something happens, never what.
- `data`, `tmp`, `obj`, `val`, `item`, `res`.
- A negative boolean: `isNotValid` makes `!isNotValid` at the call site.
- `I` on an interface, `Type` on a type, `get` on a reader.

==> #docs/procedures/plugin/connections.md

# Procedure: connections

## Declare it

```ts
outbound: ["redis://cache.internal:6379"],
```

An origin, never a path, and only in a scheme the kernel knows:

```
https  wss  redis  rediss  postgres  postgresql  mysql
mongodb  mongodb+srv  amqp  amqps  grpc  grpcs
```

`http`, `ws` and `ftp` are refused in the clear. There is no scheme for a
disk, so a directory is config and nothing checks what a plugin does with it.

Declaring is not dialling: `ctx.fetch` speaks https and nothing else. What it
cannot carry, a driver carries.

## What a call answers

`ctx.fetch` answers the parsed body and nothing else. A refusal throws an
`OutboundFault` carrying `code` and, for a `STATUS`, the status: that is where
a partner's 410 and its 503 are told apart, so branch on both:

```ts
if (cause instanceof OutboundFault)
{
    if (cause.code === "STATUS" && cause.status === 410) { return this.#stop(); }

    return this.#retry();
}
```

Reading only `code` retries a permanent 410 until the attempts run out.

## Own it

A service is built per request, a connection is not, so it lives outside one:

```ts
setup: async (ctx) => { ctx.owns(await connect(ctx.config.url)); },
teardown: async (ctx) => { await ctx.owned<Client>()?.quit(); },
```

One per plugin, opened once, closed once. A service reads it through
`ctx.owned<Client>()` and refuses 503 when it is not there yet. A second
plugin never opens a second: it asks the one that owns it, through `dependsOn`
and the public API.

## Rules

- The kit holds the database and the http server. Never a second of either.
- Name the shape you need as a type; let the driver answer it.
- A driver is imported in one file, never in a service.

==> #docs/procedures/plugin/contract.md

# Procedure: plugin contract

`plugin.ts` is the whole boundary: undeclared means it does not exist, and the
kernel refuses to start, naming the plugin and the cause. `over` names what
`ctx.db` and `ctx.services` are: the kernel imports no driver, so nothing
infers them.

```ts
export default definePlugin.over<CatalogDb, Services>()("catalog", { … });
```

## Keys

- `version` raised by a breaking change to a name or payload, `describe` one
  line of what this owns, `dependsOn` the plugins whose API it uses.
- `config`: a schema, validated at startup. Never a secret.
- `permissions`: those it defines, used elsewhere by key.
- `tables`, `migrations`: its own, run in dependency order.
- `scope`: the claim deciding whose rows these are, see `scoping.md`.
- `outbound`: hosts it may reach, see `connections.md`.
- `services`: a factory returning what it runs on.
- `routes`: `method`, `path`, `describe`, `input`, `output`, `handle`, and
  `requires` or `public`. `reads` names headers seen, `limit` a budget.
- `emits`, `listens`: announced and heard, each with a schema.
- `hooks`, `participates`: points it owns, and others' it joins.
- `commands`: entry points, a schema and optional `requires`: a scheduled one
  runs for nobody, so it names none.

Signatures are in `reference.md`. `identify` is an option of `start`, not a
key here.
- `setup` / `teardown`: run at start and stop.

## Rules

`services` comes before anything reading it: inference runs left to right.

The kernel checks the owner's schema: an event against `emits`, a hook against
`hooks`. A listener's own only names the type it is handed.

A route is closed until `public: true`, and `requires` never accompanies it.
`output` names all that may leave, and a header outside `reads` never reaches
the handler.

==> #docs/procedures/plugin/scoping.md

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

==> #docs/procedures/plugin/storage.md

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

==> #docs/procedures/plugin/structure.md

# Procedure: plugin structure

## Folders

```
plugins/<name>/
├── plugin.ts       the contract: all that crosses the boundary
├── index.ts        the public API: what another plugin may call
├── schemas/        a zod schema and what parses against it
├── types/          shapes describing code alone: a context, a handle
├── tables/         one table per file
├── migrations/     NNNN-name.sql, run in dependency order
├── services/       the logic: one class per subject
├── routes/         one file per resource, handlers only
├── utils/          pure, domain-free
└── tests/
```

No `index.ts` inside a folder: a plugin is private throughout.

## Where code belongs

Stop at the first yes:

1. Crosses a boundary, so it needs a schema → `schemas/`
2. Describes only code, so it needs none → `types/`
3. Describes a table → `tables/`
4. Answers a request → `routes/`
5. Knows the domain, not the request → `services/`
6. Pure and domain-free → `utils/`

A route handler holds no logic: it reads its input and calls a service.

## Naming and style

Folder and `name` are the same word, lowercase. The ban on `utils` and
`helpers` is on the plugin name, not the folder inside one. A folder that
cannot be named in one word is two plugins.

A file inside carries no plugin prefix: `schemas/Item.ts`, not
`schemas/DemoItem.ts`. It returns at `index.ts`, where a consumer sees it out
of context.

A service is a class named for its subject, not suffixed. `ctx` in its
constructor, `#private` for what only it calls. A util is a class too, holding no `ctx` and exported already built:

```ts
class Folding { searched(raw: string): string { … } }

export const Text = new Folding();
```

Everything else is an object of methods. Imports: values, types, the file's
own, then its export. Allman braces.

==> #docs/procedures/plugin/text.md

# Procedure: text

## SQLite sorts and folds ASCII only

```
ORDER BY s       Apfel, Ostern, Zebra, Äpfel, Österreich, über
Intl.Collator    Apfel, Äpfel, Ostern, Österreich, über, Zebra
```

`lower('ÄÖÜ')` answers `ÄÖÜ`, `LIKE '%über%'` misses `Übergrößen`, `NOCASE`
folds A to Z and nothing else.

Two problems, not one. **Ordering** is `Intl.Collator` in the service, so a
page is a cursor naming the last row, re-found with the same comparator, never
`LIMIT/OFFSET`. **Matching** is a folded column the service writes, and is
wrong in Turkish: never order on one.

Matching and uniqueness want different folds: `Apfel` should find `Äpfel`, but
a shop may sell both.

## A character is three different numbers

`"👨‍👩‍👧‍👦"` is length 11, code points 7, graphemes 1. `z.string().max(200)`
counts UTF-16 units and calls them characters. Bound what you mean:
`Intl.Segmenter` for characters, `TextEncoder` for bytes. `Array.from` counts
code points, which is neither. The kit bounds a body in bytes.

A cheap `.max()` on the route with an exact count in the parser is the usual
pair.

## Normalisation and locale

Normalise where text enters, with `raw.normalize("NFC")`.

A schema's message is English; the kit has no locale. A caller needing
otherwise translates a `Refusal`'s `code`.

==> #docs/procedures/security.md

# Procedure: security

## What the kit holds

Mechanical, so no plugin forgets:

- **Input** is a schema on every route. A handler never sees what failed.
- **Output** is a whitelist; one that cannot strip is refused at startup, not
  at the request.
- **Errors**: only a `Refusal` speaks to a caller.
- **Routes are closed** until `public: true`. Not deciding fails shut.
- **Credentials never reach a handler.** A route reading `cookie` or
  `authorization` is refused at startup.
- **Outbound** reaches only what the plugin declared, and `ctx.fetch` never
  follows a redirect: the kernel checked the first url, never the second.
- **Bodies** are bounded before parsing; secrets compared with `same`.
- **Writes** are serialised: one request's query cannot land inside another's
  transaction.

## What you hold

- Ownership is a query, not a permission. Scope the read.
- Missing and not yours: both 404.
- A route without a `limit` has none.
- Another server's answer is input.

A private `#mine()` / `#one(id)` / `#missing()` trio on a service makes that
404 automatic instead of remembered.

## Files

The kit holds none of this. A file is the one input a schema cannot judge: it
checks a field's shape, never what is inside it.

- Bound what the bytes claim, not only how many: zip bomb, PNG bomb.
- Name, extension and content type are the caller's claims.
- Store under an id you made; never build a path from a caller's name.
- Never serve a type the caller chose.
- A row is scoped, the bytes on disk are not. Reach them through the row, so a
  guessed id answers 404 like any other.

==> #docs/procedures/testing.md

# Procedure: testing a plugin

A plugin tests itself in its own `tests/`, without the rest of the API. The
whole `/testing` surface is in `reference.md`.

## What to test

Through the public surface, never the implementation.

- **Routes**: every status one answers, through `kernel.handle`, so the
  permission check and both schemas run.
- **Services**: what a caller gets, and what reached the database.
- **The contract**: that the kernel accepts `plugin.ts`.

Test what a schema must reject, not what it takes. Per route: no caller id, a
missing permission, a body failing the schema, a handler returning more than
`output` names. Write the attack: a body claiming another caller's id, an
output carrying a hash, an error naming a table.

## Assembling

A plugin boots one it depends on, or listens to, by naming
`@plugins/<name>/plugin`. Only a test may, and nothing deeper.

In-memory SQLite with the real migrations. Never reach the network; `answers`
replies to an outbound call instead.

Arrange, act, assert, a blank line between. Shared preparation is fine, a
shared assertion is not.

## Proving a test

Break the behaviour: remove the guard, widen the output schema, delete the
emit. Watch it fail naming the real cause, then put it back. A green check
never broken proves nothing.

==> #docs/reference.md

# Reference

## Refusal and Answered

```ts
throw new Refusal(400, "BAD_TITLE", "A title is 1 to 200 characters.", {
    title: "Between 1 and 200.",
});

return new Answered(201, item, { location: `/items/${item.id}` });
```

`Refusal(status, code, message, fields?)`: only a `Refusal` speaks to a
caller, any other error answers a fixed 500. `fields` maps an input name to
what to do. An `Answered` sets status and headers; it still passes the output
schema and may not set what the kit owns, like `content-type`. `POST` is 201,
else 200.

## Imports

```ts
import { definePlugin, defineRoute, Refusal } from "@onetype/stack-api-kit";
```

`defineListener`, `defineParticipant` and `defineCommand` are the same shape:
called once for the context, then the schema and the handler.

Two entry points, and nothing is in both. `@onetype/stack-api-kit` holds
everything a plugin or `main.ts` uses at runtime, faults included:
`KernelFault`, `OutboundFault`, `Kernel`, `Caller`, `Endpoint`. Its `/testing`
holds what only a test uses: `startTestKernel`, `createCaller`, `Project`.

`equalsInConstantTime(left, right)` compares secrets in constant time.

## Context

`name`, `config`, `services`, `log`, `caller`, `headers`, `db`, `tx`, `write`,
`fetch`, `events.emit`, `hooks.run`, `permissions.has` / `.all` / `.claims`,
`commands.run` / `.later`, `scoped` / `stamped` / `forScope`, `owns`,
`use`, `now`. `caller` is undefined outside a request: in `setup`, and in a
listener.

## identify

```ts
identify?: (kernel: Kernel) => (c: HonoContext) => Caller | undefined | Promise<Caller | undefined>

identify: (kernel) => async (c) => Sessions.of(kernel, c.req.header("cookie"))
```

Given the started kernel, so it may reach a plugin's public API. Runs once per
request and answers a `Caller` carrying `id`, `permissions` and `claims`, or
nothing: a stranger, not a refusal. Throwing is 401, never 500. Unset, every
closed route is 401.

## Testing

```ts
const api = await startTestKernel({
    plugins: [mine], config: { mine: { pageSize: 10 } },
    answers: () => { throw new OutboundFault("STATUS", "Refused.", 503); },
    outbox: true, schedule: true, now: () => clock,
});

const who = createCaller(["items.read"], ownerId, { tenantId: "acme" });

await api.kernel.handle({
    method: "GET", path: "/items/:id", input: { id }, caller: who,
    headers: { "user-agent": "test" }, from: "203.0.113.7",
});
```

An unknown option is refused, not ignored. `config` is keyed by plugin.
`OutboundFault` codes: `TIMEOUT`, `ABORTED`, `NETWORK`, `TOO_LARGE`,
`MALFORMED`, `STATUS`. `handle` takes the declared path, parameters in
`input`. `from` is what a rate limit counts an anonymous caller by: without it
every stranger shares one counter.

Answers `{ kernel, said, called(), heard(), settled(), due(), stop() }`:

```ts
said     [{ level, plugin, line, ...what ctx.log was given }]
called() [{ method, url, body, headers }]
heard()  [{ plugin, event, payload }]
```

`heard()` names the field `event`, not `name`, and records every emit, even
one nothing listens for. `settled()` waits for what an emit started, listeners
of listeners included. `due()` runs the schedule; `said` explains a 500.
`kernel.context(plugin, caller)` reaches a service, `kernel.run(command,
input, caller)` a command, `kernel.events.failures()` the listeners that
threw. `kernel.routes()` is in `procedures/deploy.md`.

==> #docs/stack.md

# Stack

One package from npm, `@onetype/stack-api-kit`, and nothing else shared.

## Tools

Node 22+, TypeScript strict with `noUncheckedIndexedAccess` and
`exactOptionalPropertyTypes`. Hono, SQLite with Drizzle, Zod, Vitest, ESLint.

## Layout

```
src/
├── kernel/     brings the API up: env, settings, logger, plugin discovery
├── plugins/    one folder per capability
├── utils/      pure code more than one plugin needs
└── main.ts     composition root
```

A util is written in the plugin that needs it, and moves to `src/utils` when a
second asks. It takes values and answers values: wanting a `ctx` makes it a
service, and is refused.

Dependencies point one way: the kernel imports no plugin, and a plugin imports
another only through its `index.ts`. ESLint refuses the deep import,
`Project.checks()` the undeclared one.

## The kit

`@onetype/stack-api-kit` has two entries. `.` carries the kernel and the
plugins we ship: `database`, `http`, `outbound`, `guard`, `mount`. `./testing`
holds what a test uses, and the checks this repository runs on itself.

## Startup

`start` opens the database, runs every plugin's migrations in dependency
order, validates every contract, rejects cycles, runs `setup` in order, then
mounts the routes on Hono. Any failure stops the boot naming the plugin and
the cause: nothing partially starts. `identify` is given the started kernel.

`pnpm verify` runs lint, typecheck and tests.
