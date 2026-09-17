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
