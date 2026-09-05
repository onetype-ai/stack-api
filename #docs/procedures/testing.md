# Procedure: testing a plugin

A plugin tests itself in its own `tests/`, without the rest of the API. The
whole `/testing` surface is in `reference.md`.

## What to test

Through the public surface, never the implementation.

- **Routes**: every status one answers, through `kernel.handle`, so the
  permission check and both schemas run.
- **Services**: what a caller gets, and what reached the database.
- **The contract**: that the kernel accepts `plugin.ts`.

Test what a schema must reject, not what it takes. Per route: no caller id, a
missing permission, a body failing the schema, a handler returning more than
`output` names. Write the attack: a body claiming another caller's id, an
output carrying a hash, an error naming a table.

## Assembling

A plugin boots one it depends on, or listens to, by naming
`@plugins/<name>/plugin`. Only a test may, and nothing deeper.

In-memory SQLite with the real migrations. Never reach the network; `answers`
replies to an outbound call instead.

Arrange, act, assert, a blank line between. Shared preparation is fine, a
shared assertion is not.

## Proving a test

Break the behaviour: remove the guard, widen the output schema, delete the
emit. Watch it fail naming the real cause, then put it back. A green check
never broken proves nothing.
