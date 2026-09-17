# Procedure: src structure

## The tree

```
src/
├── main.ts         composition root
├── kernel/         env, settings, logger, discovery
├── plugins/        one folder a capability
└── utils/          pure, no domain
```

Nothing central lists the plugins: adding one touches no file above it.

## Inside a plugin

`*` kernel requires it.

```
plugins/<name>/
├── plugin.ts *     one default export
├── usage.md *      under 1800 characters
├── index.ts        one exported object
├── schemas/        Name.ts, one zod schema a file
├── types/          Name.ts, one type a file
├── tables/         name.ts, one table a file
├── migrations/     NNNN-name.sql, in order
├── services/       name.ts, one class a file
├── routes/         name.ts, one resource a file
├── utils/          Name.ts, one class a file
└── tests/          name.test.ts, flat
```
