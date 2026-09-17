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
pnpm dev              # http://localhost:7280, allowing the app on 7380
pnpm verify           # lint, typecheck, test

PORT=7281 DATABASE_FILE=/tmp/mine/app.db pnpm dev   # a server of your own
```

Two people sharing one need not: a restart empties the database under both.

`PORT`, `DATABASE_FILE`, `ORIGINS`, `BODY_BYTES`, `LOG_LEVEL`, `OUTBOX`,
`SCHEDULE`, `SOCKETS`, `BEHIND_PROXY` and `WATCH_SECONDS` configure it. Everything
defaults but `ORIGINS`, which starts empty: no browser origin is allowed until
one is named, which is the safe default rather than a missing one.

Nothing identifies a caller until a plugin declares `identifies`. Until then
every route that is not `public` answers 401: the API working, not a bug.

## Where to read

`#docs/` is everything: how to add and use a plugin, the structure and why,
a procedure for each part. `docs.md` beside it is the same documents folded
into one file, for reading without walking a tree.

No worked example ships. `src/plugins/` and `src/utils/` are empty, so the
procedures in `#docs/` are the only description of a plugin's shape: read
those rather than looking for code that is not here.

The stack starts with no plugins at all, answering no routes but its own
health.
