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
plugins/<plugin>/
├── plugin.ts *     one default export
├── usage.md *      under 1800 characters
├── index.ts        the public API, the only file another plugin may import
├── schemas/        PascalCase.ts, one zod schema a file
├── types/          PascalCase.ts, one type a file
├── tables/         camelCase.ts, one table a file
├── migrations/     NNNN-name.sql, applied in order
├── services/       camelCase.ts, one class a file
├── routes/         camelCase.ts, one resource a file
├── utils/          PascalCase.ts, one object a file
└── tests/          camelCase.test.ts, flat
```

Placeholders every example uses: `placeholders.md`.
