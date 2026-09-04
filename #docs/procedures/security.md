# Procedure: security

## What the kit holds

Mechanical, so no plugin forgets:

- **Input** is a schema on every route. A handler never sees what failed.
- **Output** is a whitelist; one that cannot strip is refused at startup, not
  at the request.
- **Errors**: only a `Refusal` speaks to a caller.
- **Routes are closed** until `public: true`. Not deciding fails shut.
- **Credentials never reach a handler.** A route reading `cookie` or
  `authorization` is refused at startup.
- **Outbound** reaches only what the plugin declared, and `ctx.fetch` never
  follows a redirect: the kernel checked the first url, never the second.
- **Bodies** are bounded before parsing; secrets compared with `same`.
- **Writes** are serialised: one request's query cannot land inside another's
  transaction.

## What you hold

- Ownership is a query, not a permission. Scope the read.
- Missing and not yours: both 404.
- A route without a `limit` has none.
- Another server's answer is input.

A private `#mine()` / `#one(id)` / `#missing()` trio on a service makes that
404 automatic instead of remembered.

## Files

The kit holds none of this. A file is the one input a schema cannot judge: it
checks a field's shape, never what is inside it.

- Bound what the bytes claim, not only how many: zip bomb, PNG bomb.
- Name, extension and content type are the caller's claims.
- Store under an id you made; never build a path from a caller's name.
- Never serve a type the caller chose.
- A row is scoped, the bytes on disk are not. Reach them through the row, so a
  guessed id answers 404 like any other.
