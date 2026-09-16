# #docs packed

Every file of these documents, one after another. A line starting
with "==> " opens a file and names its path; everything until the next
such line is that file, byte for byte.

Read it here. Nothing needs unpacking, and editing this file directly is work
the next pack throws away.

==> #docs/kit/1.refusal.md

# Refusal

The only thrown value that reaches a caller; anything else becomes a 500.

```ts
throw new Refusal(400, "BAD_TITLE", "A title is 1 to 120 characters.", {
    title: "Between 1 and 120 characters.",
});
```

Status, a code to branch on, a sentence for a person, and which field failed.
A row outside the caller's scope returns 404, because 403 confirms it exists.

==> #docs/kit/10.upload.md

# UploadedFile

A route declaring `accepts: "form"` reads `multipart/form-data`: text parts
reach `input` as fields, file parts as `UploadedFile`.

```ts
import { isUploadedFile } from "@onetype/stack-api-kit";

accepts: "form",
input: z.object({ file: z.custom(isUploadedFile) }),
handle: (input, ctx) => ctx.services.<subject>.<method>(input.file.bytes),
```

`{ name, type, bytes }`, where `name` and `type` are the caller's claims and
`bytes` is the whole file in memory, bounded by `BODY_BYTES`. Store under an
id you generate: a filename of `../../etc/passwd` parses as cleanly as
`photo.png`, and `claimedName(name)` strips the path, not the intent.

The kit holds no store. A row is scoped and the bytes are not, so reach them
through the row: a guessed id then returns 404 like any other.

A test passes one as a plain object in `input`; `serve` parses the form.

==> #docs/kit/11.channels.md

# Channels

A plugin declares what it pushes on, and how far each goes.

```ts
channels: {
    "<name>.<thing>": { describe, schema, reach: "scope", requires: ["<name>.read"] },
},
```

`reach` is `connection` for the socket that asked, `viewer` for every socket
one person has open, `scope` for everyone a claim puts together, `everyone`
written in full: a public channel is a deliberate choice.

`ctx.push(channel, message)` takes no audience: the kernel reads it from
`ctx.identity`, so a push inside a request reaches that caller's scope and no
further. A listener has no identity, so it pushes through
`ctx.forScope(claim)`.

A socket carries what `sockets: { claim }` in `start` names, and the wire
calls `subscribe(identity, send)` with the connection's identity. `main.ts`
passes `undefined` until it identifies one, and a connection with no identity
receives only `everyone`.

A client sends JSON over `/ws`: `{ "subscribe": "<channel>" }`,
`{ "unsubscribe": "<channel>" }`, or a whole request as
`{ id, method, path, input }`.

==> #docs/kit/2.context.md

# ctx

What every service, route, listener and command receives. Built per request,
so one never serves the next request as the previous caller.

- **Plugin**: `name`, `config`, `log`, `now(): ms`.
- **Caller**: `identity`, `permissions.has(key)`, `headers`, `sent`.
- **Database**: `db` reads. Every write goes through `write(run)` for one
  statement or `tx(run)` for several: a bare write can join another request's
  open transaction and be lost in its rollback, after reporting success.
  `scoped(table)` narrows a read to the caller, `stamped(table)` fills the
  owner column on a write.
- **Another scope**: `forScope(claim)`, for a listener or a command,
  which have no caller, so `scoped` and `stamped` refuse.
  Refused where a caller exists, so a scope is never chosen implicitly.
- **Other plugins**: `services` its own, `use(plugin)` another's public API,
  `events.emit`, `hooks.run`, `commands.run`, `push(channel, message)`.
- **Outbound**: `fetch(call)` over https, `owns(x)` and `owned()` for a
  connection opened once in `setup`.

```ts
const rows = await ctx.db.select().from(<name>).where(ctx.scoped("<name>"));

await ctx.tx(async (inside) =>
{
    await inside.db.insert(<name>).values({ ...ctx.stamped("<name>"), <field> });

    inside.events.emit("<name>.<thing>.<happened>", { id });
});
```

`tx` provides a new `ctx`: the query goes through `inside.db`, or it runs
outside the transaction. `scoped` and `stamped` behave the same either way,
and what `inside` emits waits for the commit, so a rollback publishes nothing.

Everything is declared in `plugin.ts` first: what is missing there fails
contract validation at startup.

==> #docs/kit/3.defineroute.md

# defineRoute

`defineRoute<<Name>Context>()` once a file, so every route it builds is typed
against that plugin's `ctx`.

==> #docs/kit/4.defineplugin.md

# definePlugin

`definePlugin(name, contract)` where a plugin keeps no rows.

`definePlugin.over<Db, Services>()(name, contract)` where it does: the two
types are what `ctx.db` and `ctx.services` resolve to inside every handler,
and the kernel imports no driver to infer them. Called twice, once for the types
and once for the contract.

==> #docs/kit/5.reply.md

# Reply

`new Reply(status, body, headers)` where the status or a header matters. A
plain object returns 200, or 201 on any POST.

==> #docs/kit/6.definelistener.md

# defineListener, defineParticipant

`defineListener<<Name>Context>()(schema, { describe, handle })`, and the same
shape for `defineParticipant`. Called twice: once for the context, then the
schema and the handler.

A listener observes what happened and returns nothing. A participant runs
before something happens and returns a string to reject it, or nothing to
allow it.

The schema names the type you receive; the kernel validates the emitter's.
`ctx.identity` is undefined in both, so the owner is carried in the
payload, and `ctx.forScope(claim)` uses it.

==> #docs/kit/7.definecommand.md

# defineCommand

`defineCommand<<Name>Context>()({ describe, schema, requires, run })`. Called
twice: once for the context, then the whole command. The method is `run`, not
`handle`.

An entry point with no route: another plugin calls it, or the schedule does. A
scheduled run has no caller, so it declares no `requires` and reaches its rows
through `ctx.forScope(claim)`.

==> #docs/kit/8.httprequesterror.md

# HttpRequestError

What `ctx.fetch` throws. Imported from the root, not `/testing`.

```ts
if (cause instanceof HttpRequestError)
{
    if (cause.code === "STATUS" && cause.status === 410) { return this.#stop(); }

    return this.#retry(cause.retryAfter);
}
```

`code` is `TIMEOUT`, `ABORTED`, `NETWORK`, `TOO_LARGE`, `MALFORMED` or
`STATUS`. Reading only `code` retries a permanent 410 until the attempts run
out, so branch on `status` too. `retryAfter` is a 429's delay, in seconds.

==> #docs/kit/9.identity.md

# Identity

```ts
{ id: string; permissions: readonly string[]; claims: Record<string, unknown> }
```

`ctx.identity`, and undefined outside a request: in `setup`, a listener, a
scheduled command. `identifies(ctx, request)` receives a web `Request`.

`permissions` is filled from `grants`, never from what `identifies` returned,
so no plugin grants itself one. `claims` is whatever the project attached, so
every read of one checks its type — `scoped` and `stamped` read the claim the
plugin declared in `scope`.

==> #docs/kit/testing/1.testkernel.md

# TestKernel

`startTestKernel(options)` boots the plugins named, over an in-memory database
built from their own tables and migrations. Each test builds its own and calls
`stop()`.

- **Invoking**: `kernel.handle(...)` a route, with an identity you already have;
  `kernel.context(name)` a ctx; `kernel.identify?.(request)` the sign-in chain,
  optional because no plugin need declare `identifies`.
- **Identities**: `createIdentity(permissions, id, claims)` builds one;
  `granted(claims, id)` calls the plugin that declares `grants` instead, so a
  test verifies the role table rather than its own copy of it.
- **Assertions**: `logLines`, `emittedEvents()`, `pushed()`,
  `sentRequests()`.
- **Scheduling**: `flush()` until every listener an emit started has finished,
  `due()` runs one scheduled batch, `drain()` until the queue is empty.

An emit runs after the caller returns, so a test must `flush()` before it
reads what a listener wrote.

==> #docs/src/kernel/kernel.md

# kernel/

What this project decides about itself, before any plugin runs.

```
env.ts       what the environment carries, parsed once and refused early
settings.ts  what a run needs, built from it
logger.ts    where a line goes
plugins.ts   discovery: every folder under plugins/ holding a plugin.ts
```

`main.ts` is the only caller, and what it passes as `config`, keyed by plugin
name, is what each reads as `ctx.config`. A plugin receives that and
`ctx.log`; reaching past them ties a capability to this one deployment.

Edited when the project changes shape: an environment variable, a log level,
somewhere else to find plugins. A capability is never added here — that is a
plugin, and adding one touches no file in this folder.

==> #docs/src/main.ts.md

# main.ts

The composition root: the one file that names the plugins, opens the database
and starts serving. Nothing else imports it.

## Installing

The kit declares `better-sqlite3`, `drizzle-orm` and `hono` as peers, so they
install alongside it and no version is chosen for you.

```
npm install @onetype/stack-api-kit better-sqlite3 drizzle-orm hono zod
```

## The whole file

Two plugins: `notes`, which keeps rows, and `access`, which says who is
calling. `start` opens the database, migrates, validates every contract and
mounts the routes.

```ts
import { createServer } from "node:http";

import { start } from "@onetype/stack-api-kit";

import access from "./plugins/access/plugin.ts";
import notes from "./plugins/notes/plugin.ts";

const log = {
    debug: (line: string, about?: Record<string, unknown>) => console.debug(line, about ?? ""),
    info: (line: string, about?: Record<string, unknown>) => console.log(line, about ?? ""),
    warn: (line: string, about?: Record<string, unknown>) => console.warn(line, about ?? ""),
    error: (line: string, about?: Record<string, unknown>) => console.error(line, about ?? ""),
};

const app = await start({
    plugins: [notes, access],
    database: { file: "./data/app.db" },
    identify: (kernel) => (c) => kernel.identify?.(c.req.raw),
    outbox: true,
    schedule: true,
    http: { origins: ["http://localhost:5173"], bodyBytes: 1_000_000 },
    log,
});

const port = Number(process.env.PORT ?? 7280);

const server = createServer((incoming, outgoing) =>
{
    const url = `http://${incoming.headers.host ?? "localhost"}${incoming.url ?? "/"}`;
    const chunks: Buffer[] = [];

    incoming.on("data", (chunk: Buffer) => chunks.push(chunk));

    incoming.on("end", () =>
    {
        const method = incoming.method ?? "GET";

        const request = new Request(url, {
            method,
            headers: incoming.headers as Record<string, string>,
            ...(method === "GET" || method === "HEAD" ? {} : { body: Buffer.concat(chunks) }),
        });

        void Promise.resolve(app.fetch(request)).then(async (answer) =>
        {
            outgoing.writeHead(answer.status, Object.fromEntries(answer.headers));
            outgoing.end(Buffer.from(await answer.arrayBuffer()));
        });
    });
});

server.listen(port, () => log.info("listening", { url: `http://localhost:${String(port)}` }));

for (const signal of ["SIGINT", "SIGTERM"] as const)
{
    process.on(signal, () =>
    {
        server.close();

        void app.stop();
    });
}
```

`app.fetch` is a web handler, so `@hono/node-server` serves it instead where
it is already a dependency. `stop` stops the kernel and closes the database.

## What start does that createKernel does not

`start` owns the whole lifetime: it migrates before any plugin runs and closes
after every one has stopped. Its refusals are the ones nothing else catches,
and each stops the boot rather than the first request:

- A declared table or index no migration creates. A `uniqueIndex` nothing
  created accepts the duplicate it was declared to stop.
- A migration reading a table another plugin owns without naming it in
  `dependsOn`.
- A plugin declaring tables while `start` was given no database.
- A store answering `tx` and `forPlugin` but not `migrate` and `close`.

`createKernel` asks only for `tx` and `forPlugin` and checks none of the
above, so a missing `CREATE INDEX` boots clean and the index is simply absent.
Use it to drive a kernel yourself; use `start` to run an application.

On the `createKernel` path two options are load-bearing, and their absence
reads as a bug elsewhere:

- **`scopeFilter`**: without it every `ctx.scoped` read throws — `"notes" used
  ctx.scoped, but no createScopeFilter was given` — which the caller sees as a
  500. `start` passes `store.createScopeFilter()` whenever a plugin declares
  `scope`.
- **`rateLimiter`**: `createKernel` refuses to start when a route declares
  `limit` and no limiter was given. `start` builds one unless `limits: false`,
  which logs a warning and counts nothing.

## The database

`tables` is keyed twice: the outer key is the plugin name, exactly as its
contract names it, and the inner key is the name that plugin declares the
table under. It is what `forPlugin` hands each plugin as `ctx.db`, and what
`createScopeFilter` resolves a scope against.

```ts
import { database } from "@onetype/stack-api-kit";

import { notes } from "./plugins/notes/tables/notes.ts";

const store = database({
    file: "./data/app.db",
    tables: { notes: { notes } },
});
```

`start` builds this for you from every plugin declaring `tables`, so pass
`database: { file }` and never construct one, unless the store is your own.

## over, and the order of its types

`definePlugin(name, contract)` where a plugin keeps no rows.
`definePlugin.over<Db, Services>()(name, contract)` where it does — and the
two forms take their types in opposite orders. Plain `definePlugin` is
`<Schema, Services, Db>`; `over` is `<Db, Services>`, database first. `over`
is the form every plugin with a table uses.

```ts
export default definePlugin.over<NotesDb, NotesServices>()("notes", {
    version: "1.0.0",
    describe: "Notes, one owner a note.",

    tables: { notes },
    migrations: "./src/plugins/notes/migrations",
    scope: { describe: "Who wrote it", claim: "userId", tables: { notes: "ownerId" } },

    permissions: {
        "notes.read": { describe: "Read your own notes." },
        "notes.write": { describe: "Write a note." },
    },

    emits: {
        "notes.note.added": { describe: "A note was written.", schema: z.object({ id: z.uuid() }) },
    },

    services: (ctx) => ({ notes: new Notes(ctx) }),
    routes: [...notesRoutes],
});
```

## Who declares a permission, and who grants it

A plugin declares only permissions under its own name: `"notes.admin"` in the
`access` contract stops the boot with `A permission is named inside its own
plugin: "notes.admin" belongs to "notes", not to "access"`.

`grants` and `grantsSupported` are the other way round. The one plugin answering for
sign-in names permissions other plugins declare, and almost never its own.
`grantsSupported` is the whole set it may ever hand out: every permission any route
requires must appear in it, or the kernel refuses to start —
`Route POST "/notes" requires "notes.write", which "access" never grants`.
Without `grantsSupported` a route can require a permission nothing grants, and the
route is simply unreachable with nothing said.

```ts
import { definePlugin } from "@onetype/stack-api-kit";

export default definePlugin("access", {
    version: "1.0.0",
    describe: "Turns a request into an identity, and an identity into permissions.",

    dependsOn: ["notes"],

    identifies: (ctx, request) =>
    {
        const user = request.headers.get("x-user");

        return user === null ? undefined : { id: user, claims: { userId: user } };
    },

    grants: (ctx, identity) => ["notes.read", "notes.write"],

    grantsSupported: ["notes.read", "notes.write"],
});
```

`claims` carries what `scope` reads: `claim: "userId"` above means `ctx.scoped`
and `ctx.stamped` read `claims.userId`. One plugin declares `identifies`, and
one declares `grants`, for the whole api.

## emit belongs inside the transaction

With `outbox: true`, `ctx.events.emit` outside a transaction throws
`UNKEPT_EVENT`: the outbox writes inside the transaction that emitted, so an
emit outside one could not reach it, and a failed listener would lose the
event with nothing kept to retry. The caller sees a 500.

```ts
await this.#ctx.tx(async (inside) =>
{
    await inside.db.insert(notes).values(saving);

    inside.events.emit("notes.note.added", { id: saving.id });
});
```

`inside.events.emit`, not `this.#ctx.events.emit`: what `inside` emits waits
for the commit, so a rollback publishes nothing.

## Running it

```
node --experimental-strip-types src/main.ts
```

```
migrations applied { count: 1, steps: [ 'notes/0001-notes.sql' ] }
kernel started { plugins: 2, routes: 2 }
listening { url: 'http://localhost:7280' }
```

A write, a read, and the same read as somebody else:

```
$ curl -X POST localhost:7280/notes -H 'content-type: application/json' \
    -H 'x-user: alice' -d '{"title":"first note"}'
{"id":"7fb0ca8c-5ac5-442d-b955-7384332d84c0","title":"first note"}

$ curl localhost:7280/notes -H 'x-user: alice'
[{"id":"7fb0ca8c-5ac5-442d-b955-7384332d84c0","title":"first note"}]

$ curl localhost:7280/notes -H 'x-user: bob'
[]

$ curl localhost:7280/notes
{"code":"UNAUTHENTICATED","message":"This request needs to be signed in."}
```

Bob is not refused: he is scoped, and owns none of these rows.

==> #docs/src/plugin/1.index.ts.md

# index.ts

The public API: the only file another plugin may import, and only when it
names this one in `dependsOn`. Everything else in the folder is private.

`<Name>` is the plugin's folder capitalised; `<subject>` is the service it
reaches, which may be another word.

```ts
import type { Context } from "@onetype/stack-api-kit";

import type { <Thing> } from "./schemas/<Thing>";
import type { <Name>Services } from "./types/<Name>Services";

const servicesOf = (ctx: Context) => ctx.use<<Name>Services>("<name>").<subject>;

export const <Name> = {
    get: (ctx: Context, id: string): Promise<<Thing>> =>
    {
        return servicesOf(ctx).get(id);
    },
};

export type { <Thing> } from "./schemas/<Thing>";
```

==> #docs/src/plugin/10.utils.util.ts.md

# utils/

The same rule as `#docs/src/utils/utils.ts.md`, reachable by this plugin
alone.

==> #docs/src/plugin/11.tests.test.ts.md

# tests/

`<name>.test.ts`, flat, one subject a file. `setup.ts` holds what they share.

Only the outermost thing is tested: the route, the public API, the listener.
A util that builds a token has no test of its own; the sign-in that uses it
does. A test that reaches inside couples to the current implementation, and
every refusal in `usage.md` has one that triggers it. Arranging may reach
inside:
`kernel.context(name) as <Name>Context` for `ctx.db`, assert through the
public path.

The database is real, in memory, with the plugin's own migrations.

```ts
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { createIdentity, startTestKernel } from "@onetype/stack-api-kit/testing";

import <name> from "@plugins/<name>/plugin";

import type { TestKernel } from "@onetype/stack-api-kit/testing";

let api: TestKernel;

beforeEach(async () =>
{
    api = await startTestKernel({ plugins: [<name>] });
});

afterEach(async () =>
{
    await api.stop();
});

describe("<what is being proved>", () =>
{
    test("<what holds, and what does not>", async () =>
    {
        const response = await api.kernel.handle({
            method: "POST",
            path: "/<name>",
            input: { <field>: "<value>" },
            identity: createIdentity(["<name>.write"]),
        });

        expect(response.status).toBe(201);
        expect(response.body).toMatchObject({ <field>: "<value>" });
    });
});
```

Write it, break the code it covers, confirm it fails naming the cause, then
restore. A test that has never failed proves nothing.

==> #docs/src/plugin/2.plugin.ts.md

# plugin.ts

The contract: everything crossing the boundary, named here or absent. The
kernel refuses to start when a declaration is missing.

`<Name>` is the folder capitalised, `<subject>` the service it holds. `over`
takes the database and services types, then the name and the contract: the
types are what `ctx.db` and `ctx.services` are inside every handler.

Required: `version`, `describe`.

```ts
export default definePlugin.over<<Name>Db, <Name>Services>()("<name>", {
    version: "1.0.0",
    describe: "<what this plugin is for>",

    dependsOn: ["<other>"],
    config: <Name>Config.schema,

    tables: { <name> },
    migrations: "./src/plugins/<name>/migrations",
    scope: { describe: "<whose row>", claim: "<claim>", tables: { <name>: "<column>" } },

    permissions: { "<name>.read": { describe: "<what it allows>" } },
    grantsSupported: ["<name>.read"],
    identifies: (ctx, request) => ({ id: "<id>", claims: {} }),
    grants: (ctx, identity) => ["<name>.read"],

    services: (ctx) => ({ <subject>: new <Name>(ctx) }),
    routes: [...<name>Routes],
    allowedHosts: ["https://<host>"],

    emits: { "<name>.<thing>.<happened>": { describe, schema } },
    channels: { "<name>.<thing>": { describe, schema, reach: "scope" } },
    hooks: { "<name>.<thing>.before-<doing>": { describe, schema } },
    listens: { "<other>.<thing>.<happened>": defineListener(schema, { describe, handle }) },
    participates: { "<other>.<thing>.before-<doing>": defineParticipant(schema, { describe, handle }) },
    commands: { "<name>.<do-thing>": defineCommand({ describe, schema, requires, run }) },

    setup: (ctx) => ctx.log.info("<name> ready", {}),
    teardown: (ctx) => ctx.log.info("<name> stopped"),
});
```

==> #docs/src/plugin/3.usage.md.md

# usage.md

What another developer reads before building against this plugin.

`<name>` is the folder, exactly as the contract names it.

```md
# <name>

## Description

<what it is, in a sentence or two: what it holds and who may see it>

## Refusals

- <every refusal, one a line, each with a test that triggers it>

## Does not

- <what another plugin owns, so a reader does not wait on this one>
```

==> #docs/src/plugin/4.schemas.schema.ts.md

# schemas/

Everything zod parses: what crosses the boundary, and the config read at
startup. `<Thing>.ts` holds `<Thing>`, as a `const` and a `type` of one name.
A secret declares no `.default()`, or the fallback value is published.

`schema` parses where it is named; `<method>` a service calls, for what
zod cannot express.

```ts
import { Refusal } from "@onetype/stack-api-kit";
import { z } from "zod";

export const <Thing> = {
    schema: z.object({
        id: z.uuid(),
        <field>: z.string(),
    }),

    <method>: (raw: string): string =>
    {
        if (<raw is not allowed>)
        {
            throw new Refusal(400, "BAD_<FIELD>", "<what a caller may do about it>", {
                <field>: "<what this one field needed>",
            });
        }

        return <raw, made regular>;
    },
};

export type <Thing> = z.infer<typeof <Thing>.schema>;
```

==> #docs/src/plugin/5.types.type.ts.md

# types/

Shapes describing code alone: nothing here crosses the boundary, and nothing
parses. `<Thing>.ts` holds `<Thing>`, except `Context.ts`, which holds
`<Name>Context`.

Three every plugin has. `plugin.ts` names the first two in `over`; the third
is the `ctx` a service, a route and a listener are each written against.

`<Name>Db.ts`

```ts
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";

import type { <name> } from "../tables/<name>";

export type <Name>Db = BetterSQLite3Database<{ <name>: typeof <name> }>;
```

`<Name>Services.ts`

```ts
import type { <Name> } from "../services/<name>";

export type <Name>Services = {
    <subject>: <Name>;
};
```

`Context.ts`

```ts
import type { Context } from "@onetype/stack-api-kit";
import type { z } from "zod";

import type { <Name>Config } from "../schemas/<Name>Config";
import type { <Name>Db } from "./<Name>Db";
import type { <Name>Services } from "./<Name>Services";

export type <Name>Context = Context<z.infer<typeof <Name>Config.schema>, <Name>Services, <Name>Db>;
```

The rest is whatever the code needs and no caller receives.

==> #docs/src/plugin/6.tables.table.ts.md

# tables/

The name in SQL carries the plugin, so two plugins may both own a `labels`.
Columns are `camelCase` in code and `snake_case` in the database. Every index
starts with the scope column, because `ctx.scoped` puts it in every read.

`uniqueIndex` rejects a duplicate. A service inserts with
`onConflictDoNothing` and checks the result: no row means the index rejected it.

```ts
import { index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const <name> = sqliteTable("<plugin>_<name>", {
    id: text("id").primaryKey(),

    <owner>Id: text("<owner>_id").notNull(),

    <field>: text("<field>").notNull(),
}, (table) => [
    index("<plugin>_<name>_<by>").on(table.<owner>Id, table.<field>),

    uniqueIndex("<plugin>_<name>_<taken>").on(table.<owner>Id, table.<unique>),
]);
```

==> #docs/src/plugin/7.migrations.migration.sql.md

# migrations/

Plain SQL, `NNNN-name.sql`, run once in number order. Every table and index
`tables/` declares is created here.

A file that already ran is never edited: databases would diverge, each
reporting the same version. Add a new file instead.

```sql
CREATE TABLE <plugin>_<name> (
    id         TEXT PRIMARY KEY,
    <owner>_id TEXT NOT NULL,
    <field>    TEXT NOT NULL
);

CREATE INDEX <plugin>_<name>_<by> ON <plugin>_<name> (<owner>_id, <field>);

CREATE UNIQUE INDEX <plugin>_<name>_<taken> ON <plugin>_<name> (<owner>_id, <unique>);
```

==> #docs/src/plugin/8.services.service.ts.md

# services/

Built once a request, so it holds `ctx` and never a caller of its own.

A read narrows with `scoped`, a write stamps with `stamped`, and every write
goes through `tx` or `write`. A read that omits `scoped` returns every
scope's rows and still compiles. A service with no table needs none of this.

Name a variable after its type: `condition` for `SQL`, `found` for a row.

```ts
import { Refusal } from "@onetype/stack-api-kit";
import { and, eq } from "drizzle-orm";

import { <name> } from "../tables/<name>";

import type { <Name>Context } from "../types/Context";
import type { SQL } from "drizzle-orm";

type Row = typeof <name>.$inferSelect;

export class <Name>
{
    readonly #ctx: <Name>Context;

    constructor(ctx: <Name>Context)
    {
        this.#ctx = ctx;
    }

    async <method>(id: string): Promise<<Thing>>
    {
        const condition = this.#ctx.scoped<SQL>("<name>");

        const [found] = await this.#ctx.db.select().from(<name>).where(and(condition, eq(<name>.id, id)));

        if (found === undefined)
        {
            throw new Refusal(404, "NOT_FOUND", "<no such thing>");
        }

        return this.#<private>(found);
    }

    async <another>(<field>: string): Promise<void>
    {
        await this.#ctx.tx(async (inside) =>
        {
            const saving = { id: crypto.randomUUID(), <field>, ...this.#ctx.stamped("<name>") } as Row;

            await inside.db.insert(<name>).values(saving);

            inside.events.emit("<name>.<thing>.<happened>", { id: saving.id });
        });
    }

    #<private>(<argument>): <Thing>
    {
        return { id: <argument>.id, <field>: <argument>.<field> };
    }
}
```

==> #docs/src/plugin/9.routes.route.ts.md

# routes/

The http surface, one file a resource. A handler reads `input` and calls a
service; the logic is not here.

As many routes as the resource has. `input` is params, query and body already
parsed and merged. `output` is a whitelist: a field it does not name never
leaves, which is what keeps a hash or an owner id in the database. A handler
returns a plain object, or a `Reply` where the status or a header matters.

```ts
import { defineRoute, Reply } from "@onetype/stack-api-kit";
import { z } from "zod";

import { <Thing> } from "../schemas/<Thing>";

import type { AnyRoute } from "@onetype/stack-api-kit";
import type { <Name>Context } from "../types/Context";

const route = defineRoute<<Name>Context>();

export const <name>Routes: readonly AnyRoute<<Name>Context>[] = [
    route({
        method: "POST",
        path: "/<name>",
        describe: "<what a reviewer needs to know>",
        requires: ["<name>.write"],
        limit: { requests: 20, seconds: 60 },

        input: z.object({ <field>: z.string() }),
        output: <Thing>.schema,
        handle: async (input, ctx) =>
        {
            const <thing> = await ctx.services.<subject>.<method>(input.<field>);

            return new Reply(201, <thing>, { location: `/<name>/${<thing>.id}` });
        },
    }),
];
```

`plugin.ts` mounts them with `routes: [...<name>Routes]`.

==> #docs/src/structure.md

# Procedure: src structure

## The tree

```
src/
├── main.ts         composition root
├── kernel/         env, settings, logger, discovery
├── plugins/        one folder a capability
└── utils/          pure, no domain
```

Nothing central lists the plugins: adding one touches no file above it.

## Inside a plugin

`*` kernel requires it.

```
plugins/<name>/
├── plugin.ts *     one default export
├── usage.md *      under 1800 characters
├── index.ts        one exported object
├── schemas/        Name.ts, one zod schema a file
├── types/          Name.ts, one type a file
├── tables/         name.ts, one table a file
├── migrations/     NNNN-name.sql, in order
├── services/       name.ts, one class a file
├── routes/         name.ts, one resource a file
├── utils/          Name.ts, one class a file
└── tests/          name.test.ts, flat
```

==> #docs/src/utils/utils.ts.md

# utils/

A class of methods any plugin may reach: `plugin.ts`, `index.ts`, a service,
a route, a schema. Exported as a singleton, so a caller never constructs one.

It takes values and returns values. Reaching a plugin or the kit is a lint
error: needing `ctx` means it is a service.

```ts
class <Name>Utils
{
    <method>(raw: string): string
    {
        return this.#<private>(raw);
    }

    #<private>(raw: string): string
    {
        return raw;
    }
}

export const <Name> = new <Name>Utils();
```

==> #docs/stack.md

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
