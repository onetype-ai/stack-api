# Procedure: plugin structure

## Folders

```
plugins/<name>/
├── plugin.ts       the contract: all that crosses the boundary
├── index.ts        the public API: what another plugin may call
├── schemas/        a zod schema and what parses against it
├── types/          shapes describing code alone: a context, a handle
├── tables/         one table per file
├── migrations/     NNNN-name.sql, run in dependency order
├── services/       the logic: one class per subject
├── routes/         one file per resource, handlers only
├── utils/          pure, domain-free
└── tests/
```

No `index.ts` inside a folder: a plugin is private throughout.

## Where code belongs

Stop at the first yes:

1. Crosses a boundary, so it needs a schema → `schemas/`
2. Describes only code, so it needs none → `types/`
3. Describes a table → `tables/`
4. Answers a request → `routes/`
5. Knows the domain, not the request → `services/`
6. Pure and domain-free → `utils/`

A route handler holds no logic: it reads its input and calls a service.

## Naming and style

Folder and `name` are the same word, lowercase. The ban on `utils` and
`helpers` is on the plugin name, not the folder inside one. A folder that
cannot be named in one word is two plugins.

A file inside carries no plugin prefix: `schemas/Item.ts`, not
`schemas/DemoItem.ts`. It goes back on at `index.ts`, where a consumer sees
the name out of context.

A service is a class: `ctx` in the constructor, `#private` for what only it
calls. A util is a class too, holding no `ctx` and exported already built:

```ts
class TextUtil { same(raw: string): string { … } }

export const Text = new TextUtil();
```

Everything else is an object with methods. Imports: values, then types,
then the file's own, then its one export. Allman braces.
