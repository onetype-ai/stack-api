import { serve } from "@hono/node-server";
import { start } from "@onetype/stack-api-kit";
import { Log } from "./kernel/logger";
import { Plugins } from "./kernel/plugins";
import { Settings } from "./kernel/settings";

import type { Failure, Logger, Started } from "@onetype/stack-api-kit";

type Server = ReturnType<typeof serve>;

class ApiRunner
{
    patience = 10_000;
    draining = 250;

    from(behindProxy: boolean)
    {
        return (c: { req: { header: (name: string) => string | undefined } }): string =>
        {
            const said = behindProxy ? c.req.header("x-forwarded-for")?.split(",")[0]?.trim() : undefined;

            return said !== undefined && said !== "" ? said : "anonymous";
        };
    }

    async open(): Promise<void>
    {
        const settings = Settings.read();
        const log = Log.at(settings.logLevel);

        const api = await start({
            plugins: await Plugins.discover(),
            database: { file: settings.database },
            outbox: settings.outbox,
            schedule: settings.schedule,
            http: {
                origins: settings.origins,
                bodyBytes: settings.bodyBytes,
                from: this.from(settings.behindProxy),
            },
            log,
        });

        const server = serve({ fetch: api.fetch, port: settings.port });

        if (settings.watchSeconds > 0)
        {
            this.watching(api, log, settings.watchSeconds * 1000);
        }

        log.info("listening", { port: settings.port, routes: api.kernel.routes().length });

        this.closing(server, api, log);
    }

    // Counted, not compared: stamps are milliseconds and a burst shares one,
    // so anything after the last one read is new, however it is stamped.
    unseen(failures: readonly Failure[], read: number): { fresh: readonly Failure[]; read: number }
    {
        return { fresh: failures.slice(read), read: failures.length };
    }

    watching(api: Started, log: Logger, every: number): NodeJS.Timeout
    {
        let read = 0;

        const beat = setInterval(() =>
        {
            const failures = api.kernel.events.failures();

            // The kernel keeps a bounded ring, so a burst larger than it drops
            // the oldest. Counting backwards is how that is noticed at all.
            if (failures.length < read)
            {
                read = 0;
            }

            const { fresh, read: now } = this.unseen(failures, read);

            read = now;

            if (fresh.length > 0)
            {
                log.error("listeners failed", {
                    count: fresh.length,
                    events: fresh.map((one) => `${one.plugin}:${one.event}`),
                    why: [...new Set(fresh.map((one) => (one.error instanceof Error ? one.error.message : String(one.error))))].slice(0, 5),
                });
            }
        }, every);

        beat.unref();

        return beat;
    }

    closing(server: Server, api: Started, log: Logger): void
    {
        let closing = false;

        const close = (signal: string): void =>
        {
            // Twice is one shutdown: Ctrl-C pressed again, or SIGTERM then
            // SIGINT, would otherwise tear down concurrently.
            if (closing)
            {
                return;
            }

            closing = true;

            log.info("stopping", { signal });

            // The outbox flushes and the database closes whether or not the
            // socket ever lets go: one held connection would otherwise keep
            // the callback from running at all.
            server.close();

            const forced = setTimeout(() =>
            {
                log.error("stop took too long", { signal });
                process.exit(1);
            }, this.patience);

            forced.unref();

            api.stop().then(
                async () =>
                {
                    // The kernel is done, but a reply it produced may still be
                    // on its way out. Leaving before it lands resets the socket,
                    // so a caller who sent a write never learns whether it took.
                    await new Promise((settle) => setTimeout(settle, this.draining));

                    process.exit(0);
                },
                (cause: unknown) =>
                {
                    log.error("stop failed", { signal, cause });
                    process.exit(1);
                },
            );
        };

        for (const signal of ["SIGTERM", "SIGINT"] as const)
        {
            process.on(signal, () =>
            {
                close(signal);
            });
        }
    }

    // JSON like every other line, so a collector that parses them keeps the
    // one message explaining why the process died.
    failed(cause: unknown): void
    {
        process.stderr.write(Log.line("error", "the api did not start", { cause }));
        process.exit(1);
    }
}

export const Api = new ApiRunner();

Api.open().catch((cause: unknown) =>
{
    Api.failed(cause);
});
