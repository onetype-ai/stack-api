import type { Logger } from "@onetype/stack-api-kit";
import type { Level } from "./settings";

type Write = (level: Level, message: string, about?: Readonly<Record<string, unknown>>) => void;

export const Log = {
    severity: { debug: 0, info: 1, warn: 2, error: 3 } as Readonly<Record<Level, number>>,

    line: (level: Level, message: string, about?: Readonly<Record<string, unknown>>): string =>
    {
        const record = { ...about, at: new Date().toISOString(), level, line: message };

        try
        {
            return `${JSON.stringify(record, Log.forJson)}\n`;
        }
        catch
        {
            return `${JSON.stringify({ at: record.at, level, line: message, about: "unreadable" })}\n`;
        }
    },

    forJson: (_key: string, value: unknown): unknown =>
    {
        if (value instanceof Error)
        {
            return { message: value.message, stack: value.stack };
        }

        return typeof value === "bigint" ? value.toString() : value;
    },

    forLevel: (level: Level = "info"): Logger =>
    {
        const write: Write = (writeLevel, message, about) =>
        {
            if ((Log.severity[writeLevel] ?? 0) >= (Log.severity[level] ?? 0))
            {
                process.stdout.write(Log.line(writeLevel, message, about));
            }
        };

        return {
            debug: (message, about) =>
            {
                write("debug", message, about);
            },
            info: (message, about) =>
            {
                write("info", message, about);
            },
            warn: (message, about) =>
            {
                write("warn", message, about);
            },
            error: (message, about) =>
            {
                write("error", message, about);
            },
        };
    },
};
