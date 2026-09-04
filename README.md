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

Nothing identifies a caller until `src/main.ts` says how. Until then every
route that is not `public` answers 401. That is the API working, not a bug.

## Where to read

- `#docs/usage.md`: how to add and use a plugin
- `#docs/stack.md`: the exact structure and why
- `#docs/architecture.md`: why plugins, why a declared boundary
- `#docs/procedures/`: how each part is built

Two worked examples, read once beside the procedures and deleted when the
project no longer needs them:

- `src/plugins/catalog` shows what one plugin does alone: scoped rows, text
  that sorts and matches in any language, a cursor, a hook, a command.
- `src/plugins/orders` depends on it, and shows what needs two, and what needs
  time: a public API call, an event heard, a hook joined, a held connection,
  and work asked for later.

Both domains are deliberately dull: take the mechanics, never the model.
