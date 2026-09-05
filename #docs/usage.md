# api

## Running

```sh
pnpm install
pnpm dev              # http://localhost:3000
pnpm verify           # lint, typecheck, test
```

`PORT`, `DATABASE_FILE`, `ORIGINS`, `BODY_BYTES`, `LOG_LEVEL`, `OUTBOX`,
`SCHEDULE`, `BEHIND_PROXY` and `WATCH_SECONDS` configure it. Everything defaults except
`ORIGINS`, which is empty: no browser origin is allowed until one is named.

`BEHIND_PROXY` reads `x-forwarded-for` as the rate limit's key. On without a
proxy, a caller invents a new key per request.

## Adding a plugin

Create `src/plugins/<name>/plugin.ts` and export a `definePlugin` result.

```ts
export default definePlugin.over<Rows, Services>()("billing", {
    version: "1.0.0",
    describe: "Invoices and payment methods.",
    dependsOn: ["auth"],
    tables: { invoices },
    migrations: "./src/plugins/billing/migrations",
    permissions: { "billing.read": { describe: "See invoices." } },
    services: (ctx) => ({ invoices: new InvoicesService(ctx) }),
    routes: [...invoiceRoutes],
});
```

`over` names what `ctx.db` and `ctx.services` are. A plugin holding no tables
writes `definePlugin(name, …)` instead.

## Using another plugin

```ts
import { Auth } from "@plugins/auth";
```

A plugin's `index.ts` is the only file another may import, and the plugin must
be in `dependsOn`. Anything deeper is rejected by lint.

`reference.md` holds every signature; `#docs/procedures/` how to build each
part.
