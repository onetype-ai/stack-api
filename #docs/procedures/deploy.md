# Procedure: the composition root and the deployment

`main.ts` holds every plugin at once. Nobody imports it, so what it may reach,
nothing else may. Signatures are in `reference.md`.

## What is running

```ts
type Registered = {
    plugin: string; method: Method; path: string; describe: string;
    requires: readonly string[]; public: boolean;
    limit: { requests: number; seconds: number } | undefined;
    reads: readonly string[];
};
```

`kernel.routes()` answers these. Assert which routes are public, that every
closed one carries a budget, and that no `reads` names a credential header. A
route opened by accident then fails a test, not a review.

## Secrets

`config` is validated and logged at startup, so nothing secret goes in it. A
credential is read from the environment here and passed in as a value:
`identify` takes the session store, `dial` the headers it sends.

## Logging

A 5xx carries the request id, the plugin, the message and the stack; a 4xx
does not.

The kit logs, it does not notify. A failed listener has nobody waiting on it,
so the root polls `kernel.events.failures()` every `WATCH_SECONDS` and warns
once per failure. Warn, never 503: one undelivered email is not a dead
process.

## Health

`/live` answers before the kernel starts. `/ready` is 503 until migrations ran
and plugins are up, and again while stopping.

## Refuses

- A secret in `config`, or read from the environment inside a plugin.
- A log line carrying a body, a token, or an undeclared header.
- A driver that is not a peer dependency, so a second copy exists.
