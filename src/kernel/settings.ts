import { Env, LEVELS } from "@onetype/stack-api-kit";
import type { Level } from "@onetype/stack-api-kit";

export type Settings = {
    port: number;
    database: string;
    outbox: boolean;
    schedule: boolean;
    sockets: boolean;
    origins: readonly string[];
    bodyBytes: number;

    behindProxy: boolean;

    watchSeconds: number;
    logLevel: Level;
};

export const Settings = {
    levels: LEVELS,

    read: (): Settings =>
    {
        return {
            port: Env.number("PORT", 7280, 1, 65_535),
            database: Env.text("DATABASE_FILE", "./data/app.db") ?? "./data/app.db",
            outbox: Env.flag("OUTBOX", false),
            schedule: Env.flag("SCHEDULE", false),
            sockets: Env.flag("SOCKETS", true),
            origins: Env.list("ORIGINS"),
            bodyBytes: Env.number("BODY_BYTES", 1_000_000, 1),
            behindProxy: Env.flag("BEHIND_PROXY", false),
            watchSeconds: Env.number("WATCH_SECONDS", 60),
            logLevel: Env.oneOf("LOG_LEVEL", Settings.levels, "info"),
        };
    },
};
