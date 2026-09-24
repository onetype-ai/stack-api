# Testing

Tests are the last step, after the plugin works, and they stay small: test
code is at most a tenth of the production code it covers, per plugin.

**Test the outside.** A route, the public API in `index.ts`, a listener.
Never a helper, a service method, or another plugin's inside: those change
when working code is refactored, and the test then breaks for nothing.

**Each layer tests itself.** The kit tests the kit and the starter tests
the starter. A plugin tests its own behaviour against the kit's public
contract, and never re-tests the kit.

**Keep every guarantee, once, in a table.** One table-driven test a
concern:

- every refusal in `usage.md`: status and code a row;
- two tenants: write in both, act as one, see nothing of the other's, for
  every read, write and delete;
- authorization: each permission missing, a row;
- stored rows: an old row still reads;
- money: the edges (zero, rounding, the limit).

```ts
test.each([
    ["an empty title", { title: "   " }, 400, "BAD_TITLE"],
    ["a title too long", { title: "x".repeat(201) }, 400, "INVALID_INPUT"],
])("refuses %s", async (_what, input, status, code) =>
{
    const response = await api.kernel.handle({ method: "POST", path: "/items", input, identity: tenantA });

    expect(response).toMatchObject({ status, body: { code } });
});
```

**Both databases.** `pnpm test` runs every test on SQLite and on Postgres
(PGlite, in the process). A plugin writes nothing for either.

**Deterministic.** Time comes from `now` or `testClock()`, and an event is
awaited with `api.flush()`. A flaky test is fixed, never given a longer
timeout.

How a test file is laid out: `plugin/11.tests.test.ts.md`.
