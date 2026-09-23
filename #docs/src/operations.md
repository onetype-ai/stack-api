# Operations

What the kit does for every request, and the one place a project decides it.

**Who called.** Behind a proxy, list it: `TRUSTED_PROXIES=10.0.0.5,10.1.0.0/16`.
Only what those proxies wrote in `x-forwarded-for` is believed, for http and
`/ws` alike, so a caller cannot spend another's rate limit.

**One line a request.** Every request leaves an access line, and every line
logged while serving it carries `requestId`, taken from a well-formed
`x-request-id` or made fresh. A service needing the id reads
`currentRequestId()`.

**Nothing secret in a log.** A credential never reaches a line, by key or by
shape. `main.ts` also masks personal data (`personal: true`): an email or an
address in `about` is written masked. Pass a value through `redact()` before
it leaves the process some other way.

**Headers.** `main.ts` starts with `strictReplyHeaders: true`: a reply sends
only the headers the kit knows, plus those its route names:

```ts
route({ method: "GET", path: "/items/export", sends: ["x-items-total"], ... })
```

**Stored rows.** A schema reading what was written earlier (an event
payload, a command input, a `Stored.define`) may only widen.
`stored-contracts.lock.json` holds the last accepted shape. `pnpm
stored:accept` updates it, and `--breaking items.details="why"` names a
change an older row would fail.

**Language.** A route answering in a language reads the header and asks:

```ts
reads: ["accept-language"],
handle: (input, ctx) => Locale.negotiate(ctx.headers["accept-language"] ?? "", ["en", "de"], "en"),
```
