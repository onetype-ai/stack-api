import type { Logger } from "@onetype/stack-api-kit";
import type { Level } from "./settings";

type Write = (level: Level, line: string, about?: Readonly<Record<string, unknown>>) => void;

export const Log = {
    order: { debug: 0, info: 1, warn: 2, error: 3 } as Readonly<Record<Level, number>>,

    // The frame is written last: what a caller passes cannot rename the time,
    // the level or the line, and an Error keeps its message instead of
    // stringifying to {}.
    line: (level: Level, line: string, about?: Readonly<Record<string, unknown>>): string =>
    {
        const written = { ...about, at: new Date().toISOString(), level, line };

        try
        {
            return `${JSON.stringify(written, Log.readable)}\n`;
        }
        catch
        {
            return `${JSON.stringify({ at: written.at, level, line, about: "unreadable" })}\n`;
        }
    },

    readable: (_key: string, value: unknown): unknown =>
    {
        if (value instanceof Error)
        {
            return { message: value.message, stack: value.stack };
        }

        return typeof value === "bigint" ? value.toString() : value;
    },

    at: (level: Level = "info"): Logger =>
    {
        const write: Write = (at, line, about) =>
        {
            // An unknown level is NaN on both sides, which silences every line.
            if ((Log.order[at] ?? 0) >= (Log.order[level] ?? 0))
            {
                process.stdout.write(Log.line(at, line, about));
            }
        };

        return {
            debug: (line, about) =>
            {
                write("debug", line, about);
            },
            info: (line, about) =>
            {
                write("info", line, about);
            },
            warn: (line, about) =>
            {
                write("warn", line, about);
            },
            error: (line, about) =>
            {
                write("error", line, about);
            },
        };
    },
};
