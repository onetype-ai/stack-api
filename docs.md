# #docs packed

Every file of these documents, one after another. A line starting
with "==> " opens a file and names its path; everything until the next
such line is that file, byte for byte.

Read it here. Nothing needs unpacking, and editing this file directly is work
the next pack throws away.

==> #docs/usage.md

# api

## Running

```sh
pnpm install
pnpm dev              # http://localhost:7280
pnpm verify           # lint, typecheck, test
```

`PORT`, `DATABASE_FILE`, `ORIGINS`, `BODY_BYTES`, `LOG_LEVEL`, `OUTBOX`,
`SCHEDULE`, `SOCKETS`, `BEHIND_PROXY` and `WATCH_SECONDS` configure it. Everything defaults except
`ORIGINS`, which is empty: no browser origin is allowed until one is named.

`SOCKETS` is the one that starts on: a front-end that opens one carries its
requests over it, and falls back to http when it cannot.

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
part, and `procedures/absent.md` what the kit deliberately does not do.

==> #docs/architecture.md

# Architecture

## One capability, one plugin

A plugin knows the domain, a package does not. New technology is a new plugin,
never a branch inside an old one.

## Three ways to cross

- **Public API** for a result now, from a plugin in `dependsOn`. Methods take
  `ctx`, so they run anywhere `ctx` does. A number crossing carries what it
  counts: `measure("bytes")` makes bytes and gigabytes different types.
- **Events** to announce what happened. Nothing comes back, nobody waits.
- **Hooks** to let a participant refuse. One refuses by returning a reason;
  throwing or never answering refuses too.

Refuses:

- Request and response over the event bus.
- A method emitting through someone else's `ctx`: an event carries the
  identity of the context it went through. Emitting belongs to the service.
- A table crossing. Data crosses as a return value or an event's payload.

## The server decides

The client hides, the server refuses. Every route parses its input and filters
its output.

## One shape, every route

A listing answers a named key, never a bare array: `{ notes: [...] }` leaves
room for a cursor beside it.

Every 4xx carries a `code` to branch on and a sentence to read, with `fields`
where the server knows which input was wrong. A number the caller needs goes
in `fields`, not into the sentence: "1 notes" is what that looks like.

## Failure is contained

A route that throws answers 500 and logs everything. A listener that throws
reaches neither the emitter nor the others, so nothing marks it but
`kernel.events.failures()`.

## Code is the authority

Plugins are discovered from the folder, not a list. A cross-plugin import is
checked against `dependsOn` by `Project.checks()`, so an undeclared one fails
the build rather than the boot.

==> #docs/procedures/absent.md

# Procedure: what the kit does not do

Each is deliberate, and each is found by trying unless it is written down.

## Sessions and cookies

A route answers `x-session-key` with `x-session-expires`, or `x-session-end`,
and `session: { name, secure }` in `start` makes the cookie, which is what a
browser wants: CORS hides the header from a script anyway. It reads that
cookie back into the header before anything sees the request, so a plugin that
never learns what a cookie is serves a token client unchanged.

## What a hook may answer

A reason to refuse, or nothing. Never data:
`hooks.run: (hook, payload) => Promise<string | undefined>`.

Needing something back means a public API call, which is what `dependsOn` is
for. Packing an answer into the string works, and says the boundary is in the
wrong place.

## Another plugin's config

There is no `ctx.configOf`. Config belongs to the plugin that declared it, and
what another needs is a method on its public API.

## Output schemas that cannot strip

`z.any`, `z.unknown`, `z.record`, a loose object, a catchall and a transform
each forward whatever the handler returned, so the kernel refuses such a route
at startup. Name every field: not knowing their names says the answer is a bag
rather than a shape.

## Locale and formatting

Every message the kit writes is English, and it formats nothing: no dates, no
numbers, no currency. A caller needing otherwise translates a `Refusal` by its
`code`.

## What a name resolves to

`outbound: "anywhere"` refuses every written form of a private address, never
what a name resolves to.

## Retries on outbound calls

`ctx.fetch` dials once. How long to back off depends on what the partner does,
so the plugin decides, branching on `OutboundFault.code`.

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

Only while the documents are a folder: packed, there is nothing to walk. The
limit is for whoever writes, and one that has to be measured is one nobody
was watching anyway.

## What it does not look at

- **Only exported types.** An unexported one, a comment, or a test reading the
  field does not count, and only the declaring plugin is searched.
- **Only `#docs/`.** The size limit never reaches a plugin's own `usage.md`.
  Hold that limit yourself.
- `checking.limit` moves the number, and the size check sleeps while `#docs`
  is packed.
- `src/utils` is checked for unread fields too, not only `src/plugins`.
- Lint refuses a util, in `src/utils` or a plugin's own, that imports a plugin
  or the kit: wanting a `ctx` makes it a service.

==> #docs/procedures/deploy.md

# Procedure: the composition root and the deployment

`main.ts` holds every plugin at once. Nobody imports it, so what it may reach,
nothing else may. Signatures are in `reference.md`.

## What is running

`kernel.routes()` answers a `Registration` per route: plugin, method, path,
`requires`, `public`, `limit`, `reads`. Assert which are public, that every
closed one carries a budget (`limit` is optional), and that no `reads` names a
credential header. A
route opened by accident then fails a test, not a review.

## Secrets

Never a secret in `config`: it sits in the repository where everyone reads
it. A credential is read from the environment here and passed as a value: `identify` takes the session store, `outbound` the
headers it sends.

## Limits

The numbers stay in the routes: how many attempts are reasonable is a
decision, not a setting. `limits: false` where nobody attacks.

## Sessions

`session: { name, secure }` turns a route's `x-session-key` into an `HttpOnly`
cookie and takes the header back out. `secure` needs https, so localhost leaves
it off or no browser keeps one.

## Logging

A 5xx carries the request id, the plugin, the message and the stack; a 4xx does
not.

The kit logs, it does not notify. Nobody waits on a failed listener, so the
root polls `kernel.events.failures()` every `WATCH_SECONDS` and warns once
each. Warn, never 503: one undelivered email is not a dead process.

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
    await inside.db.insert(notes).values(row);
    inside.events.emit("notes.note.written", { id: row.id, ownerId: row.ownerId });
});
```

Held until the commit. What holds it is the open transaction, not the context
you called `emit` on: what escapes is an emit after it ends. Emitting belongs
to the service, not `plugin.ts`. `ctx.identity` is undefined in a listener, so
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
exist, so a test boots the emitter too. That boot is not a cycle even where
the emitter depends on the listener: the checker reads production code, so a
loop it reports is one a deployment would load.

Your `listens` schema names the type you are handed, it does not check it. The
kernel checks the emitter's, so drift hands your handler a value that is not
what you said instead of refusing it. The emitter's `version` says it moved.

A listener runs after the caller, so `await api.settle()` before asserting.
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

**Without a schedule it throws, it does not go quiet.** Asked inside a
transaction, that takes the whole write down: the caller gets a 500 and
nothing is stored. Half-done work nobody can chase is the worse outcome, so
the refusal is deliberate.

## No caller, and it may run twice

`ctx.identity` is undefined, so whose work this is travels in the input. A
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

`http`, `ws` and `ftp` are refused in the clear. `outbound: "anywhere"` is for
hosts that are rows rather than constants.

Declaring is not dialling: `ctx.fetch` speaks https and nothing else. What it
cannot carry, a driver carries.

## What a call answers

`ctx.fetch` answers the parsed body and nothing else, or the raw string when
the call declared `accepts: "text"`, which is what a page or a sitemap is.
A refusal throws an `OutboundFault` carrying `code` and, for a `STATUS`, the
status: that is where a partner's 410 and its 503 are told apart, so branch on
both:

```ts
if (cause instanceof OutboundFault)
{
    if (cause.code === "STATUS" && cause.status === 410) { return this.#stop(); }

    return this.#retry();
}
```

Reading only `code` retries a permanent 410 until the attempts run out.
`retryAfter` says what a 429 asked.

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
kernel refuses to start, naming the plugin and the cause. `over` names what `ctx.db`
and `ctx.services` are: the kernel imports no driver to infer them.

## Keys

- `version` raised by a breaking change, `describe` one line of what this
  owns, `dependsOn` whose API it uses.
- `config`: a schema, validated at startup. Never a secret.
- `permissions`: those it defines, used by key elsewhere.
- `tables`, `migrations`: its own, in dependency order.
- `scope`: the claim deciding whose rows these are, see `scoping.md`.
- `outbound`: hosts it may reach, see `connections.md`.
- `services`: a factory returning what it runs on.
- `routes`: `method`, `path`, `describe`, `input`, `output`, `handle`, and
  `requires` or `public`. `reads` names headers, `limit` a budget, `accepts` a
  form body.
- `emits`, `listens`: announced and heard, each with a schema.
- `channels`: what it pushes to whoever watches, and how far each goes.
- `hooks`, `participates`: points it owns, and others' it joins.
- `identifies`, `grants`, `mayGrant`: who is calling, what it means, and what
  startup holds that to. One plugin each.
- `commands`: entry points, a schema and optional `requires`: a scheduled one
  runs for nobody, so names none.

- `setup` / `teardown`: run at start and stop.

Signatures are in `reference.md`.

## Rules

`services` precedes anything reading it: inference runs left to right.

The kernel checks the owner's schema: an event against `emits`, a hook against
`hooks`. A listener's own names only the type it is handed.

`output` names all that may leave; a header outside `reads` never reaches the
handler.

==> #docs/procedures/plugin/files.md

# Procedure: files

## How bytes arrive

`accepts: "form"` reads `multipart/form-data`: text parts reach `input` as
fields, file parts as `Upload` — `name`, `type`, `bytes`. Declared, never
sniffed, so a route expecting JSON cannot be handed a file, and the wrong kind
of body is 415.

A schema names a file field with `z.custom(isUpload)`. Bound the bytes there:
nothing bounds one part apart from the body limit over all of them.

Without it a body is JSON, and bytes come base64 in a field a schema names.
That costs a third more on the wire and holds the file twice: measured, ten
5 MB uploads at once cost 224 MB against 6 MB streamed.

## Anything larger

A file worth streaming does not belong in a request. Sign a URL, let the
browser send straight to the store, keep the row. Measured against base64:
0.007 ms per request and no bytes through the process, against 2.3 ms and
139 MB.

## Rules

- Bound what the bytes claim, not only how many: zip bomb, PNG bomb.
- Name, extension and type are the caller's claims. The kit strips a path from
  the name, which is all it promises: it is still their word.
- Store under an id you made; never build a path from a caller's name.
- Never serve a type the caller chose.
- A row is scoped, the bytes are not. Reach them through the row, so a guessed
  id answers 404 like any other.

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
Public route:  scoped and stamped are 403. forScope works.
```

The test is the caller, never the route. `forScope` throws whenever
`ctx.identity` exists: run such a command with none, `kernel.run(name,
input)`, or let the schedule run it.

A knife: an unknown caller chooses whose rows they land in. Use it where the
action proves identity, and never let the body name the scope.

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
├── types/          shapes describing code alone
├── tables/         one table a file
├── migrations/     NNNN-name.sql, in dependency order
├── services/       the logic: one class per subject
├── routes/         handlers only, one per resource
├── utils/          pure, no domain
└── tests/
```

No `index.ts` inside a folder: a plugin is private throughout.

## Where code belongs

Stop at the first yes:

1. Crosses a boundary, so it needs a schema → `schemas/`
2. Describes only code, no schema → `types/`
3. Describes a table → `tables/`
4. Answers a request → `routes/`
5. Knows the domain, not the request → `services/`
6. Pure and domain-free → `utils/`

A route handler holds no logic: it reads input and calls a service.

## Naming and style

Folder and `name` are the same word, lowercase. The ban on `utils` and
`helpers` is on the plugin name, not the folder inside. One that needs two
words is two plugins.

A file inside carries no plugin prefix: `schemas/Item.ts`, not
`schemas/DemoItem.ts`. It returns at `index.ts`, where a consumer sees it out
of context.

A service is a class named for its subject, not suffixed: `ctx` in the
constructor, `#private` for what only it calls. A util is one too, with no
`ctx`, exported already built:

```ts
class TextUtils { searchable(raw: string): string {…} }

export const Text = new TextUtils();
```

Everything else is an object of methods. Allman braces; imports in order:
values, types, the file's own.

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

Matching and uniqueness want different folds: `Apfel` should find `Äpfel`, and
both may still be kept apart. `Text.searchable` and `Text.comparable`.

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
  `authorization` is refused at startup; one setting `set-cookie` is dropped.
  A session leaves on `x-session-key` with `x-session-expires`, or
  `x-session-end` to close one, and `session` in `start` makes the cookie. A
  plugin that never learns what a cookie is serves a token client unchanged.
- **Outbound** reaches only what the plugin declared, and never follows a
  redirect: the kernel checked the first url, never the second.
- **Bodies** are bounded before parsing; secrets compared with
  `equalsInConstantTime`.
- **Writes** are serialised: one request's query cannot land inside another's.

## What you hold

- Ownership is a query, not a permission. Scope the read.
- Missing and not yours: both 404.
- A route without a `limit` has none.
- Another server's answer is input.

Three private methods make that 404 automatic rather than remembered, and
every read in the service goes through them:

```ts
#whereOwner(): SQL | undefined
{
    return this.#ctx.scoped<SQL>("notes");
}

#whereId(id: string): SQL | undefined
{
    return and(eq(notes.id, id), this.#whereOwner());
}

#notFoundError(): Refusal
{
    return new Refusal(404, "NOT_FOUND", "No such note.");
}
```

Files are their own subject: `procedures/plugin/files.md`.

==> #docs/procedures/testing.md

# Procedure: testing a plugin

A plugin tests itself in its own `tests/`, without the rest of the API. The
whole `/testing` surface is in `reference.md`.

## What to test

Through the public surface, never the implementation.

- **Routes**: every status one answers, through `kernel.handle`, so the
  permission check and both schemas run.
- **Services**: what a caller gets, and what reached the database.
- **The contract**: that the kernel accepts `plugin.ts`. Filter
  `kernel.routes()` on `plugin`: a test that booted a dependency asserts about
  its routes too, and goes red the day somebody else adds one.

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

Not enough? Every signature is in the kit's `dist/types.d.ts`.

## Refusal and Reply

```ts
throw new Refusal(400, "BAD_TITLE", "A title is 1 to 200 characters.", {
    title: "Between 1 and 200.",
});

return new Reply(201, item, { location: `/items/${item.id}` });
```

`Refusal(status, code, message, fields?)`: only a `Refusal` speaks to a
caller, any other error answers a fixed 500. `fields` maps an input name to
what to do. A `Reply` sets status and headers; it still passes the output
schema and may not set what the kit owns, like `set-cookie`. `POST` is 201,
else 200.

## Imports

```ts
import { definePlugin, defineRoute, Refusal } from "@onetype/stack-api-kit";
```

`defineListener`, `defineParticipant` and `defineCommand` are the same shape:
called once for the context, then the schema and the handler.

Two entry points, and nothing is in both. `@onetype/stack-api-kit` holds
everything a plugin or `main.ts` uses at runtime, faults included:
`KernelFault`, `OutboundFault`, `Kernel`, `Identity`, `Endpoint`. Its `/testing`
holds what only a test uses: `startTestKernel`, `createIdentity`, `Project`.

`equalsInConstantTime(left, right)` compares secrets in constant time.

## Context

`name`, `config`, `services`, `log`, `identity`, `headers`, `db`, `tx`, `write`,
`fetch`, `events.emit`, `commands.run` / `.later`, `scoped` / `stamped` /
`forScope`, `owns`, `use`, `now`. The ones whose answer is easy to guess wrong:

```ts
identity: { id: string; permissions: readonly string[]; claims: Record<string, unknown> } | undefined
hooks.run: (hook: string, payload: unknown) => Promise<string | undefined>
permissions: { has(one): boolean; all(many): boolean; claims(): Record<string, unknown> }
```

A hook answers a refusal or nothing, never data. `claims` is what the project
attached, so every read of one checks its type. `identity` is undefined outside
a request: in `setup`, and in a listener.

## Who is calling

Two ways, and a plugin's wins.

```ts
identifies: (ctx, request) => Sessions.of(ctx, request.headers.get("cookie"))
```

A contract key, in the plugin that holds identity. At most one declares it,
and `main.ts` then names nobody.

```ts
identify: (kernel) => async (c) => Sessions.of(kernel, c.req.header("cookie"))
```

A `start` option, for an application whose identity lives outside every
plugin. Given the started kernel, so it may reach a public API.

Either runs once per request. Nothing is a stranger, not a refusal; throwing
is 401, never 500. With neither, every closed route is 401.

## Testing

```ts
const api = await startTestKernel({
    plugins: [mine], config: { mine: { pageSize: 10 } },
    answers: () => { throw new OutboundFault("STATUS", "Refused.", 503); },
    outbox: true, schedule: true, now: () => clock,
});

const owner = createIdentity(["items.read"], ownerId, { tenantId: "acme" });

await api.kernel.handle({
    method: "GET", path: "/items/:id", input: { id }, identity: owner,
    headers: { "user-agent": "test" }, from: "203.0.113.7",
});
```

An unknown option is refused, not ignored. `config` is keyed by plugin.
`OutboundFault` codes: `TIMEOUT`, `ABORTED`, `NETWORK`, `TOO_LARGE`,
`MALFORMED`, `STATUS`. `handle` takes the declared path, parameters in
`input`. `from` is what a rate limit counts an anonymous caller by: without it
every stranger shares one counter.

Answers `{ kernel, logLines, outboundCalls(), emittedEvents(), settle(), due(),
drain(), stop() }`:

```ts
logLines        [{ level, plugin, line, ...what ctx.log was given }]
outboundCalls() [{ method, url, body, headers }]
emittedEvents() [{ plugin, event, payload }]
```

`emittedEvents()` names the field `event`, not `name`, and records an emit
nobody hears. `settle()` waits for what one started; `logLines` explains a 500.
`due()` runs one turn and answers how many it took, `drain(most = 20)` runs
until nothing is left, which is what a chain of commands needs.

`kernel.context(plugin, identity)` reaches a service, `kernel.run(command,
input, identity)` a command, `kernel.events.failures()` the listeners that
threw — the only thing `kernel.events` holds. Emitting goes through the
context of the plugin that owns the event: `kernel.context("notes").events.emit`. **Leave `identity` out for a command using `forScope`:** a request's
scope is the caller's, so any identity makes it refuse.

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

A util is written in the plugin that needs it and moves to `src/utils` when a
second asks. It takes values and answers values: wanting a `ctx` makes it a
service, and is refused.

Dependencies point one way: the kernel imports no plugin, and a plugin imports
another only through its `index.ts`. (The kit's own use `api.ts`: its
convention, not yours.) ESLint refuses the deep import, `Project.checks()` the
undeclared one.

## The kit

`@onetype/stack-api-kit` has two entries. `.` carries the kernel and the
plugins we ship: `database`, `http`, `outbound`, `guard`, `mount`. `./testing`
holds what a test uses, and the checks this repository runs on itself.

## Startup

`start` opens the database, runs every plugin's migrations in dependency
order, validates every contract, rejects cycles, runs `setup` in order, then
mounts the routes on Hono. Any failure stops the boot naming the plugin and
the cause: nothing partially starts. `identify` is given the started kernel.

`database` takes a path, or a `Store` of your own: Postgres or anything else
answering `of` and `tx` replaces SQLite without the kernel knowing. Left out,
nothing opens and a plugin declaring tables is refused by name, so a site
keeping no rows says nothing about databases.

`pnpm verify` runs lint, typecheck and tests.
