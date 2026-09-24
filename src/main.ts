import { pathToFileURL } from "node:url";

import { Log, Server, start } from "@onetype/stack-api-kit";

import { Plugins } from "./kernel/plugins";
import { Settings } from "./kernel/settings";

export async function open(): Promise<void>
{
    const settings = Settings.read();
    // Personal data (emails, addresses) is masked in every line, as credentials always are.
    const log = Log.forLevel(settings.logLevel, { personal: true });
    const plugins = await Plugins.discover();

    const api = await start({
        plugins,
        config: Settings.configFor(plugins),
        database: settings.database,
        outbox: settings.outbox,
        strictReplyHeaders: true,
        // Every process may ask for work later; only one started with SCHEDULE=true runs it.
        schedule: settings.schedule ? true : "enqueue",
        sockets: settings.sockets,
        http: {
            origins: settings.origins,
            bodyBytes: settings.bodyBytes,
            // Only the proxies named are believed about who called; with none, the socket's own address counts.
            from: Server.from(settings.trustedProxies.length > 0 ? { trustedProxies: settings.trustedProxies } : false),
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

    Server.open(api, {
        port: settings.port,
        log,
        trustedProxies: settings.trustedProxies,
        watchSeconds: settings.watchSeconds,
    });
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href)
{
    open().catch((cause: unknown) =>
    {
        process.stderr.write(Log.line("error", "the api did not start", { cause }));
        process.exit(1);
    });
}
