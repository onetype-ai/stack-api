# Procedure: connections

## Declare it

```ts
outbound: ["redis://cache.internal:6379"],
```

An origin, never a path, and only in a scheme the kernel knows:

```
https  wss  redis  rediss  postgres  postgresql  mysql
mongodb  mongodb+srv  amqp  amqps  grpc  grpcs
```

`http`, `ws` and `ftp` are refused in the clear. There is no scheme for a
disk, so a directory is config and nothing checks what a plugin does with it.

Declaring is not dialling: `ctx.fetch` speaks https and nothing else. What it
cannot carry, a driver carries.

## What a call answers

`ctx.fetch` answers the parsed body and nothing else. A refusal throws an
`OutboundFault` carrying `code` and, for a `STATUS`, the status: that is where
a partner's 410 and its 503 are told apart, so branch on both:

```ts
if (cause instanceof OutboundFault)
{
    if (cause.code === "STATUS" && cause.status === 410) { return this.#stop(); }

    return this.#retry();
}
```

Reading only `code` retries a permanent 410 until the attempts run out.

## Own it

A service is built per request, a connection is not, so it lives outside one:

```ts
setup: async (ctx) => { ctx.owns(await connect(ctx.config.url)); },
teardown: async (ctx) => { await ctx.owned<Client>()?.quit(); },
```

One per plugin, opened once, closed once. A service reads it through
`ctx.owned<Client>()` and refuses 503 when it is not there yet. A second
plugin never opens a second: it asks the one that owns it, through `dependsOn`
and the public API.

## Rules

- The kit holds the database and the http server. Never a second of either.
- Name the shape you need as a type; let the driver answer it.
- A driver is imported in one file, never in a service.
