# Reference

## Refusal and Answered

```ts
throw new Refusal(400, "BAD_TITLE", "A title is 1 to 200 characters.", {
    title: "Between 1 and 200.",
});

return new Answered(201, item, { location: `/items/${item.id}` });
```

`Refusal(status, code, message, fields?)`: only a `Refusal` speaks to a
caller, any other error answers a fixed 500. `fields` maps an input name to
what to do. An `Answered` sets status and headers; it still passes the output
schema and may not set what the kit owns, like `content-type`. `POST` is 201,
else 200.

## Imports

```ts
import { Answered, definePlugin, defineRoute, Refusal, same } from "@onetype/stack-api-kit";
```

`defineListener`, `defineParticipant` and `defineCommand` are the same shape:
called once for the context, then the schema and the handler.

Two entry points, and nothing is in both. `@onetype/stack-api-kit` holds
everything a plugin or `main.ts` uses at runtime, faults included:
`KernelFault`, `OutboundFault`, `Kernel`, `Caller`, `Endpoint`. Its `/testing`
holds what only a test uses: `booting`, `calling`, `Project`, `boundaries`.

`same(left, right)` compares two strings in constant time.

## Context

`name`, `config`, `services`, `log`, `caller`, `headers`, `db`, `tx`, `write`,
`fetch`, `events.emit`, `hooks.run`, `permissions.has` / `.all` / `.claims`,
`commands.run` / `.later`, `scoped` / `stamped` / `forScope`, `owns` / `owned`,
`use`, `now`. `caller` is undefined outside a request: in `setup`, and in a
listener.

## identify

```ts
identify?: (kernel: Kernel) => (c: HonoContext) => Caller | undefined | Promise<Caller | undefined>

identify: (kernel) => async (c) => Sessions.of(kernel, c.req.header("cookie"))
```

Given the started kernel, so it may reach a plugin's public API. Runs once per
request and answers a `Caller` carrying `id`, `permissions` and `claims`, or
nothing: a stranger, not a refusal. Throwing is 401, never 500. Unset, every
closed route is 401.

## Testing

```ts
const api = await booting({
    plugins: [mine], config: { mine: { pageSize: 10 } },
    answers: () => { throw new OutboundFault("STATUS", "Refused.", 503); },
    outbox: true, schedule: true, now: () => clock,
});

const who = calling(["items.read"], ownerId, { tenantId: "acme" });

await api.kernel.handle({
    method: "GET", path: "/items/:id", input: { id }, caller: who,
    headers: { "user-agent": "test" }, from: "203.0.113.7",
});
```

An unknown option is refused, not ignored. `config` is keyed by plugin.
`OutboundFault` codes: `TIMEOUT`, `ABORTED`, `NETWORK`, `TOO_LARGE`,
`MALFORMED`, `STATUS`. `handle` takes the declared path, parameters in
`input`. `from` is what a rate limit counts an anonymous caller by: without it
every stranger shares one counter.

Answers `{ kernel, said, called(), heard(), settled(), due(), stop() }`:

```ts
said     [{ level, plugin, line, ...what ctx.log was given }]
called() [{ method, url, body, headers }]
heard()  [{ plugin, event, payload }]
```

`heard()` names the field `event`, not `name`, and records every emit, even
one nothing listens for. `settled()` waits for what an emit started, listeners
of listeners included. `due()` runs the schedule; `said` explains a 500.
`kernel.context(plugin, caller)` reaches a service, `kernel.run(command,
input, caller)` a command, `kernel.events.failures()` the listeners that
threw. `kernel.routes()` is in `procedures/deploy.md`.
