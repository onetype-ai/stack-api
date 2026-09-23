# stack-api

Plugin-based HTTP API. Every capability is a plugin; the kernel starts them
and enforces the boundaries between them.

It starts with no plugins at all, answering no route but its own health.

## Setting up

```sh
pnpm install
```

## Running

```sh
pnpm dev              # http://localhost:7280, allowing the app on 7380
pnpm start            # once, no watch
pnpm verify           # lint, typecheck, test
pnpm schemas          # rewrite schemas.md from the installed kit

PORT=7281 DATABASE_FILE=/tmp/mine/app.db pnpm dev   # a server of your own
```

Two people sharing one database need not: a restart empties it under both.

## Configuration

`PORT`, `DATABASE_FILE`, `ORIGINS`, `BODY_BYTES`, `LOG_LEVEL`, `OUTBOX`,
`SCHEDULE`, `SOCKETS`, `TRUSTED_PROXIES`, `WATCH_SECONDS`. Each is validated at
startup and refused by name, so a typo stops the boot rather than taking a
default.

A plugin's config is read as `<PLUGIN>__<FIELD>`: plugin `web-crawler`, field
`baseURL`, reads `WEB_CRAWLER__BASE_URL`. A variable no field reads, or one set
for a plugin that declares no config, stops the boot by name. A refused value
is never printed. `pnpm dev` and `pnpm start` read `.env`; copy `.env.example`.

Everything defaults but `ORIGINS`, which starts empty: no browser origin is
allowed until one is named.

Every process may ask for work later; only one started with `SCHEDULE=true`
runs it. `GET /live`, `/health` and `/ready` answer for an orchestrator.

Nothing identifies a caller until a plugin declares `identifies`. Until then
every route that is not `public` answers 401 — the API working, not a bug.

## Where to read

| | |
|---|---|
| `#docs/usage.md` | what this project is: rewrite it first |
| `#docs/architecture.md` | what is built, and what is decided but not yet |
| `#docs/stack.md` | what the kit is for, and what `verify` catches |
| `#docs/src/structure.md` | where a file goes |
| `#docs/src/operations.md` | proxies, request ids, logs, headers, stored rows, language |
| `#docs/src/testing.md` | what to test, how much, and when |
| `#docs/src/plugin/` | one procedure a file, each with an example |
| `schemas.md` | the kit's whole surface, generated from its published types |

`src/plugins/` and `src/utils/` are empty. The procedures show one neutral
plugin, `items`, in pieces: copy the shape, never the words.
