# done

- Composition only: `main.ts` reads settings, discovers plugins, starts, and
  hands the result to `Server.open`. 52 lines.
- `Settings` names this project's keys and their defaults — `PORT`, `ORIGINS`,
  `DATABASE_FILE`, `BODY_BYTES`, `LOG_LEVEL` and the rest — and validates each
  through the kit's rules at startup.
- Two tests, both of which can fail: the plugins this project ships start
  together, and `Started.findAll` finds nothing.
- Proved on the thing it runs on, not only in a test runner: started on port
  7291, answered 404 with `content-security-policy` and `cache-control`, and
  on `SIGTERM` logged `stopping`, released the port and exited zero.

## Moved into the kit

- `Env` and `Log` (8 and 4 tests), `from` and `freshFailures` (9 tests), and
  `listen`, `watch`, `closeOnSignal` and the socket frame reader, which had no
  tests here at all and have 23 there.
- Three of four tests in `starting.test.ts` were checking what `start` already
  refuses, so none of them could ever have failed.
