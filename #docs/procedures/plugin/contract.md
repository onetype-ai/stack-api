# Procedure: plugin contract

`plugin.ts` is the whole boundary: undeclared means it does not exist, and the
kernel refuses to start, naming the plugin and the cause. `over` names what
`ctx.db` and `ctx.services` are: the kernel imports no driver, so nothing
infers them.

```ts
export default definePlugin.over<Rows, Services>()("catalog", { … });
```

## Keys

- `version` raised by a breaking change to a name or payload, `describe` one
  line of what this owns, `dependsOn` the plugins whose API it uses.
- `config`: a schema, validated at startup. Never a secret.
- `permissions`: those it defines, used elsewhere by key.
- `tables`, `migrations`: its own, run in dependency order.
- `scope`: the claim deciding whose rows these are, see `scoping.md`.
- `outbound`: hosts it may reach, see `connections.md`.
- `services`: a factory returning what it runs on.
- `routes`: `method`, `path`, `describe`, `input`, `output`, `handle`, and
  `requires` or `public`. `reads` names headers seen, `limit` a budget.
- `emits`, `listens`: announced and heard, each with a schema.
- `hooks`, `participates`: points it owns, and others' it joins.
- `commands`: entry points, a schema and optional `requires`: a scheduled one
  runs for nobody, so it names none.

Signatures are in `reference.md`. `identify` is an option of `start`, not a
key here.
- `setup` / `teardown`: run at start and stop.

## Rules

`services` comes before anything reading it: inference runs left to right.

The kernel checks the owner's schema: an event against `emits`, a hook against
`hooks`. A listener's own only names the type it is handed.

A route is closed until `public: true`, and `requires` never accompanies it.
`output` names all that may leave, and a header outside `reads` never reaches
the handler.
