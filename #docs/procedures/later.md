# Procedure: work that happens later

## Asking

```ts
await ctx.tx(async (inside) =>
{
    await inside.db.insert(holds).values(row);

    inside.commands.later("bookings.release-hold", { id: row.id }, 600);
});
```

`later(name, input, seconds)`. Only a command your own plugin declares, and
only when `start` was given `schedule: true`. Asked inside a transaction it is
written by that transaction, so work scheduled by something that rolled back
never runs.

## No caller, and it may run twice

`ctx.caller` is undefined, so whose work this is travels in the input. A
scheduled command declares no `requires`: no permission can be granted to
nobody.

An attempt that throws goes back, counted, waiting longer each time up to a
minute, then is abandoned with a log line. Key what it writes on the input.

## Repeating

There is no `every`. Work that repeats asks for itself again as it ends, so a
failing run cannot pile a second copy behind the first:

```ts
ctx.commands.later("items.sweep", {}, 3600);
```

Ask only while something waits. A fixed number of times carries the count in
the input, so it survives a restart. There is no cron syntax and the kit has
no timezone: for an hour each day you work out the seconds yourself.

## Expiry is a read, not an event

A hold past its moment is one your reads ignore; the command only tidies up.
