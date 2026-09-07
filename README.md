# stack-api

Plugin-based HTTP API. Every capability is a plugin; the kernel starts them
and enforces the boundaries between them.

## Setting up

```sh
pnpm install
```

The kernel is one package from npm, `@onetype/stack-api-kit`. Nothing else is
shared.

## Running

```sh
pnpm dev              # http://localhost:7280
pnpm verify           # lint, typecheck, test

PORT=7281 DATABASE_FILE=/tmp/mine/app.db pnpm dev   # a server of your own
```

Two people sharing one need not: a restart empties the database under both.

`PORT`, `DATABASE_FILE`, `ORIGINS`, `BODY_BYTES`, `LOG_LEVEL`, `OUTBOX`,
`SCHEDULE`, `BEHIND_PROXY` and `WATCH_SECONDS` configure it. Everything
defaults but `ORIGINS`, which starts empty: no browser origin is allowed until
one is named, which is the safe default rather than a missing one.

Nothing identifies a caller until a plugin declares `identifies`. Until then
every route that is not `public` answers 401: the API working, not a bug.

## Where to read

`docs.md` is everything: how to add and use a plugin, the structure and why,
a procedure for each part. One file, so it reads without walking a tree.

`src/plugins/example.txt` is the three worked examples:

- `notes` shows what one plugin does alone: scoped rows, a cursor the database
  walks, text that matches and sorts in any language, a quota, a hook.
- `labels` shows every way across a boundary: a public API call, an event
  heard, a hook joined, a command run for nobody.
- `readers` says who is calling and what that means, so `main.ts` need not
  know which plugin holds a session.

The domains are dull on purpose: take the mechanics, never the model.

`src/utils/example.txt` is the two shared utilities, the same way. Each is a
folder folded into one file: every path and line, in reading order.
