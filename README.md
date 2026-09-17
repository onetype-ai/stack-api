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
`SCHEDULE`, `SOCKETS`, `BEHIND_PROXY`, `WATCH_SECONDS`. Each is validated at
startup and refused by name, so a typo stops the boot rather than taking a
default.

Everything defaults but `ORIGINS`, which starts empty: no browser origin is
allowed until one is named.

Nothing identifies a caller until a plugin declares `identifies`. Until then
every route that is not `public` answers 401 — the API working, not a bug.

## Where to read

| | |
|---|---|
| `#docs/stack.md` | what the kit is for, and what `verify` catches |
| `#docs/src/structure.md` | where a file goes |
| `#docs/src/placeholders.md` | what every `<name>` in an example stands for |
| `#docs/src/plugin/` | one procedure a file: what to write, and a skeleton |
| `schemas.md` | the kit's whole surface, generated from its published types |

No worked example ships: `src/plugins/` and `src/utils/` are empty. The
procedures are the description of a plugin's shape.
