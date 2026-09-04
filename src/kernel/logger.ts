import type { Logger } from "@onetype/stack-api-kit";
import type { Level } from "./settings";

type Write = (level: Level, line: string, about?: Readonly<Record<string, unknown>>) => void;

export const Log = {
    order: { debug: 0, info: 1, warn: 2, error: 3 } as Readonly<Record<Level, number>>,

    line: (level: Level, line: string, about?: Readonly<Record<string, unknown>>): string =>
    {
        return `${JSON.stringify({ at: new Date().toISOString(), level, line, ...about })}\n`;
    },

    at: (level: Level = "info"): Logger =>
    {
        const write: Write = (at, line, about) =>
        {
            if (Log.order[at] >= Log.order[level])
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
