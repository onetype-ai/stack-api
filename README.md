# stack-api

Plugin-based HTTP API. Every capability is a plugin; the kernel starts them
and enforces the boundaries between them.

## Setting up

```sh
pnpm install
```

The kernel is one package from npm, `@onetype/stack-api-kit`. Nothing else is
shared, and nothing is linked.

## Running

```sh
pnpm dev              # http://localhost:3000
pnpm verify           # lint, typecheck, test
```

`PORT`, `DATABASE_FILE`, `ORIGINS`, `BODY_BYTES`, `LOG_LEVEL`, `OUTBOX`,
`SCHEDULE`, `BEHIND_PROXY` and `WATCH_SECONDS` configure it. Everything
defaults except `ORIGINS`, which starts empty: no browser origin is allowed
until one is named, and that is the safe default rather than a missing one.

Nothing identifies a caller until a plugin declares `identifies`. Until then
every route that is not `public` answers 401. That is the API working, not a
bug.

## Where to read

`docs.md` is everything: how to add and use a plugin, the structure and why,
and a procedure for each part. One file, so it reads without walking a tree.

`src/plugins/example.txt` is the three worked examples, the same way:

- `notes` shows what one plugin does alone: scoped rows, a cursor the database
  walks, text that matches and sorts in any language, a quota, a hook.
- `labels` depends on it, and shows every way across a boundary: a public API
  call, an event heard, a hook joined, a command run for nobody.
- `readers` says who is calling and what that means, so nothing in `main.ts`
  has to know which plugin holds a session.

The domains are deliberately dull: take the mechanics, never the model.

`src/utils/example.txt` is the two shared utilities, written the same way.

Each is a folder folded into one file: every path and every line, in the order
somebody would read them. Read them where they are.
