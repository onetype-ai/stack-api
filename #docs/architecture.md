# Architecture

## One capability, one plugin

A plugin knows the domain, a package does not. New technology is a new plugin,
never a branch inside an old one.

## Three ways to cross

- **Public API** for a result now, from a plugin in `dependsOn`. Methods take
  `ctx`, so they run anywhere `ctx` does.
- **Events** to announce what happened. Nothing comes back, nobody waits.
- **Hooks** to let a participant refuse. One refuses by returning a reason;
  throwing or never answering refuses too. Participating in your own hook is
  an `if` written the hard way.

Refuses:

- Request and response over the event bus.
- A method emitting through someone else's `ctx`: an event carries the
  identity of the context it went through. Emitting belongs to the service.
- A table crossing. Data crosses as a return value or an event's payload.

## The server decides

The client hides, the server refuses. Every route parses its input and filters
its output.

## Failure is contained

A route that throws answers 500 and logs everything. A listener that throws
reaches neither the emitter nor the others, so nothing marks it but
`kernel.events.failures()`.

## Code is the authority

Plugins are discovered from the folder, not a list. A cross-plugin import is
checked against `dependsOn`, so an undeclared one fails.
