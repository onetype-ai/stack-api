import { serve } from "@hono/node-server";
import { start } from "@onetype/stack-api-kit";
import { Log } from "./kernel/logger";
import { Plugins } from "./kernel/plugins";
import { Settings } from "./kernel/settings";

import type { Failure, Logger, Started } from "@onetype/stack-api-kit";

type Server = ReturnType<typeof serve>;

export const Api = {
    from: (behindProxy: boolean) => (c: { req: { header: (name: string) => string | undefined } }): string =>
    {
        const said = behindProxy ? c.req.header("x-forwarded-for")?.split(",")[0]?.trim() : undefined;

        return said !== undefined && said !== "" ? said : "anonymous";
    },

    open: async (): Promise<void> =>
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
                from: Api.from(settings.behindProxy),
            },
            log,
        });

        const server = serve({ fetch: api.fetch, port: settings.port });

        if (settings.watchSeconds > 0)
        {
            Api.watching(api, log, settings.watchSeconds * 1000);
        }

        log.info("listening", { port: settings.port, routes: api.kernel.routes().length });

        Api.closing(server, api, log);
    },

    unseen: (failures: readonly Failure[], seen: number): { fresh: readonly Failure[]; seen: number } =>
    {
        const fresh = failures.filter((one) => one.at > seen);

        return { fresh, seen: fresh.reduce((latest, one) => Math.max(latest, one.at), seen) };
    },

    watching: (api: Started, log: Logger, every: number): NodeJS.Timeout =>
    {
        let seen = 0;

        const beat = setInterval(() =>
        {
            const { fresh, seen: read } = Api.unseen(api.kernel.events.failures(), seen);

            seen = read;

            if (fresh.length > 0)
            {
                log.error("listeners failed", {
                    count: fresh.length,
                    events: [...new Set(fresh.map((one) => `${one.plugin}:${one.event}`))],
                });
            }
        }, every);

        beat.unref();

        return beat;
    },

    closing: (server: Server, api: Started, log: Logger): void =>
    {
        const close = (signal: string): void =>
        {
            log.info("stopping", { signal });

            server.close(() =>
            {
                void api.stop().then(() => process.exit(0));
            });
        };

        for (const signal of ["SIGTERM", "SIGINT"] as const)
        {
            process.on(signal, () =>
            {
                close(signal);
            });
        }
    },

    failed: (cause: unknown): void =>
    {
        process.stderr.write(`${cause instanceof Error ? cause.stack ?? cause.message : String(cause)}\n`);
        process.exit(1);
    },
};

Api.open().catch(Api.failed);
