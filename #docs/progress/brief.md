# brief

## What this is

A Stack API with no capabilities in it. Every capability is a plugin, and this
carries none: it starts, answers no route but its own health, and waits for
the first one somebody writes.

Its boundary is composition. Which plugins this API ships, which port it
listens on, which origins may call it — nothing else. Everything a plugin can
do, and everything checked before one starts, belongs to
`@onetype/stack-api-kit` and is documented there.

## Where we are

`src/kernel/` is four files and `main.ts` is 52 lines. Two tests: it starts
with the plugins it ships, and it holds to every rule a running kernel is
checked by.

It was 253 lines and 28 tests. What left did not disappear — `Env`, `Log`,
reading a forwarded address, listening on a port, stopping on a signal, and
watching listeners that failed all moved into the kit, where every project
gets them instead of writing them again. The tests moved with them.

## Vision

Somebody clones this, writes one plugin, and ships. Nothing in the scaffold
should be read before that, and nothing in it should need changing to do it.

## Next

A first real plugin, which is the only thing that will say whether the
scaffold is actually empty enough.
