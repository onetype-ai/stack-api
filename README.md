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

`docs.md` is everything: how to add and use a plugin, the exact structure and
why, why plugins at all, and a procedure for each part. It is one file so it
can be read without walking a tree.

`src/plugins/example.txt` is the two worked examples, the same way:

- `catalog` shows what one plugin does alone: scoped rows, text that sorts and
  matches in any language, a cursor, a hook, a command.
- `orders` depends on it, and shows what needs two, and what needs time: a
  public API call, an event heard, a hook joined, a held connection, and work
  asked for later.

Both domains are deliberately dull: take the mechanics, never the model. Read
them once, then pack them away for good.

`src/utils/example.txt` is the two shared utilities.

## Packing

Each of those files is a folder folded into one, and folds back:

```sh
pnpm unpack:docs      # docs.md -> #docs/
pnpm unpack:plugins   # example.txt -> the plugin folders
pnpm unpack:utils
```

`pnpm pack:docs`, `pnpm pack:plugins` and `pnpm pack:utils` fold them back and
remove what they read, so there is one copy rather than two that drift apart.
Pack takes names, so any plugin folds away the same way:
`pnpm pack:plugins billing`.

The checks that read the documents skip while they are packed and say which
command brings them back. Unpack before working on what is inside; pack when
you are done.
