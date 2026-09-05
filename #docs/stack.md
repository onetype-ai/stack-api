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

A util is written in the plugin that needs it, and moves to `src/utils` when a
second asks. It takes values and answers values: wanting a `ctx` makes it a
service, and is refused.

Dependencies point one way: the kernel imports no plugin, and a plugin imports
another only through its `index.ts`. ESLint refuses the deep import,
`Project.checks()` the undeclared one.

## The kit

`@onetype/stack-api-kit` has two entries. `.` carries the kernel and the
plugins we ship: `database`, `http`, `outbound`, `guard`, `mount`. `./testing`
holds what a test uses, and the checks this repository runs on itself.

## Startup

`start` opens the database, runs every plugin's migrations in dependency
order, validates every contract, rejects cycles, runs `setup` in order, then
mounts the routes on Hono. Any failure stops the boot naming the plugin and
the cause: nothing partially starts. `identify` is given the started kernel.

`pnpm verify` runs lint, typecheck and tests.
