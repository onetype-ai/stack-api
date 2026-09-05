import { Env } from "./env";

export type Level = "debug" | "info" | "warn" | "error";

export type Settings = {
    port: number;
    database: string;
    outbox: boolean;
    schedule: boolean;
    origins: readonly string[];
    bodyBytes: number;

    behindProxy: boolean;

    watchSeconds: number;
    logLevel: Level;
};

export const Settings = {
    levels: ["debug", "info", "warn", "error"] as const satisfies readonly Level[],

    read: (): Settings =>
    {
        return {
            port: Env.number("PORT", 3000, 1, 65_535),
            database: Env.text("DATABASE_FILE", "./data/app.db") ?? "./data/app.db",
            outbox: Env.on("OUTBOX", false),
            schedule: Env.on("SCHEDULE", false),
            origins: Env.list("ORIGINS"),
            bodyBytes: Env.number("BODY_BYTES", 1_000_000, 1),
            behindProxy: Env.on("BEHIND_PROXY", false),
            watchSeconds: Env.number("WATCH_SECONDS", 60),
            logLevel: Env.one("LOG_LEVEL", Settings.levels, "info"),
        };
    },
};
