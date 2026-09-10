import { pathToFileURL } from "node:url";

import { Hono } from "hono";
import { serve, upgradeWebSocket } from "@hono/node-server";
import type { WebSocketServerLike } from "@hono/node-server";
import { WebSocketServer } from "ws";
import { start } from "@onetype/stack-api-kit";
import { Log } from "./kernel/logger";
import { Plugins } from "./kernel/plugins";
import { Settings } from "./kernel/settings";

import type { ListenerFailure, Logger, RunningApp } from "@onetype/stack-api-kit";

type Server = ReturnType<typeof serve>;

class Api
{
    patience = 10_000;
    draining = 250;

    from(behindProxy: boolean)
    {
        return (c: { req: { header: (name: string) => string | undefined } }): string =>
        {
            const forwarded = behindProxy ? c.req.header("x-forwarded-for")?.split(",")[0]?.trim() : undefined;

            return forwarded !== undefined && forwarded !== "" ? forwarded : "anonymous";
        };
    }

    async open(): Promise<void>
    {
        const settings = Settings.read();
        const log = Log.forLevel(settings.logLevel);

        const api = await start({
            plugins: await Plugins.discover(),
            database: { file: settings.database },
            outbox: settings.outbox,
            schedule: settings.schedule,
            sockets: settings.sockets,
            http: {
                origins: settings.origins,
                bodyBytes: settings.bodyBytes,
                from: this.from(settings.behindProxy),
            },
            log,
        });

        process.on("unhandledRejection", (cause: unknown) =>
        {
            log.error("a promise was rejected and nobody was listening", { cause });
        });

        process.on("uncaughtException", (cause: unknown) =>
        {
            log.error("something threw where nothing could catch it", { cause });
            process.exit(1);
        });

        const server = this.listen(api, settings.port);

        if (settings.watchSeconds > 0)
        {
            this.watch(api, log, settings.watchSeconds * 1000);
        }

        log.info("listening", { port: settings.port, routes: api.kernel.routes().length });

        this.closeOnSignal(server, api, log);
    }

    listen(api: RunningApp, port: number): Server
    {
        const joining = api.sockets;

        if (joining === undefined)
        {
            return serve({ fetch: api.fetch, port });
        }

        const app = new Hono();

        app.get("/ws", upgradeWebSocket(() =>
        {
            let subscription: ReturnType<typeof joining.subscribe> | undefined;

            return {
                onOpen: (_event, socket) =>
                {
                    subscription = joining.subscribe(undefined, (text: string) =>
                    {
                        socket.send(text);
                    });
                },

                onMessage: (event, socket) =>
                {
                    const said = (event as { data?: unknown }).data;

                    void this.handleSocketMessage(api, subscription, String(said), (text: string) =>
                    {
                        socket.send(text);
                    });
                },

                onClose: () =>
                {
                    subscription?.close();
                },
            };
        }));

        app.all("*", (c) => api.fetch(c.req.raw));

        return serve({ fetch: app.fetch, port, websocket: { server: new WebSocketServer({ noServer: true }) as unknown as WebSocketServerLike } });
    }

    async handleSocketMessage(api: RunningApp, subscription: { listenTo: (channel: string) => boolean; stopListening: (channel: string) => void } | undefined, text: string, send: (text: string) => void): Promise<void>
    {
        const request = JSON.parse(text) as {
            id?: string; method?: string; path?: string;
            query?: Record<string, unknown>; body?: Record<string, unknown>;
            headers?: Record<string, string>;
            subscribe?: string; unsubscribe?: string;
        };

        if (request.subscribe !== undefined)
        {
            subscription?.listenTo(request.subscribe);

            return;
        }

        if (request.unsubscribe !== undefined)
        {
            subscription?.stopListening(request.unsubscribe);

            return;
        }

        const answer = await api.kernel.handle({
            method: (request.method ?? "GET") as Parameters<typeof api.kernel.handle>[0]["method"],
            path: request.path ?? "/",
            input: { ...request.query, ...request.body },
            headers: request.headers ?? {},
            from: "socket",
        });

        send(JSON.stringify({ id: request.id, status: answer.status, body: answer.body }));
    }

    freshFailures(failures: readonly ListenerFailure[], read: number): { fresh: readonly ListenerFailure[]; read: number }
    {
        return { fresh: failures.slice(read), read: failures.length };
    }

    watch(api: RunningApp, log: Logger, every: number): NodeJS.Timeout
    {
        let read = 0;

        const timer = setInterval(() =>
        {
            const failures = api.kernel.events.failures();

            if (failures.length < read)
            {
                read = 0;
            }

            const { fresh, read: now } = this.freshFailures(failures, read);

            read = now;

            if (fresh.length > 0)
            {
                log.error("listeners failed", {
                    count: fresh.length,
                    events: fresh.map((failure) => `${failure.plugin}:${failure.event}`),
                    why: [...new Set(fresh.map((failure) => (failure.error instanceof Error ? failure.error.message : String(failure.error))))].slice(0, 5),
                });
            }
        }, every);

        timer.unref();

        return timer;
    }

    closeOnSignal(server: Server, api: RunningApp, log: Logger): void
    {
        let closing = false;

        const close = (signal: string): void =>
        {
            if (closing)
            {
                return;
            }

            closing = true;

            log.info("stopping", { signal });

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

    reportFailure(cause: unknown): void
    {
        process.stderr.write(Log.line("error", "the api did not start", { cause }));
        process.exit(1);
    }
}

export const api = new Api();

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href)
{
    api.open().catch((cause: unknown) =>
    {
        api.reportFailure(cause);
    });
}
