import { describe, expect, test } from "vitest";

import { Log } from "../logger";

const said = (about: Readonly<Record<string, unknown>>): Record<string, unknown> =>
{
    return JSON.parse(Log.line("error", "billing failed", about)) as Record<string, unknown>;
};

describe("a log line", () =>
{
    test("keeps its own time, level and message whatever a caller passes", () =>
    {
        const one = said({ at: "1999-01-01T00:00:00.000Z", level: "debug", line: "nothing to see here" });

        expect(one.level).toBe("error");
        expect(one.line).toBe("billing failed");
        expect(one.at).not.toBe("1999-01-01T00:00:00.000Z");
    });

    test("and says why an error happened rather than {}", () =>
    {
        expect(JSON.stringify(said({ cause: new Error("the database is on fire") })))
            .toContain("the database is on fire");
    });

    test("and is still written when what it was given cannot be read", () =>
    {
        const round: Record<string, unknown> = {};

        round.self = round;

        expect(() => Log.line("error", "billing failed", { round, big: 1n })).not.toThrow();
    });

    test("and a level nobody knows does not silence the rest", () =>
    {
        expect(Log.at("shouting" as never)).toBeDefined();
    });
});
