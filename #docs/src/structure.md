# src structure

```
src/
├── main.ts         composition root
├── kernel/         settings and plugin discovery
├── plugins/        one folder a capability
└── utils/          pure, no domain
```

Nothing central lists the plugins: adding one touches no file above it.

## Inside a plugin

`*` is required by the kernel.

```
plugins/items/
├── plugin.ts *     one default export: the contract
├── usage.md *      under 1800 characters
├── index.ts        the public API, the only file another plugin may import
├── schemas/        PascalCase.ts, one zod schema a file
├── types/          PascalCase.ts, one type a file
├── tables/         camelCase.ts, one table a file
├── migrations/     sqlite/ and postgres/, generated
├── services/       camelCase.ts, one class a file
├── routes/         camelCase.ts, one resource a file
├── utils/          PascalCase.ts, one object a file
└── tests/          camelCase.test.ts, flat
```

The folders above are the common ones, not a closed list. When code doesn't
fit any of them, create a new folder named for its role instead of forcing it
into an existing one. `utils/` holds only small, domain-free helpers.

## The examples

Every procedure in `plugin/` shows one plugin, `items`: a tenant's `Item`s,
each with a `title`. A second, `activity`, listens to it. The words are
neutral on purpose: replace each with your own, keep none.
