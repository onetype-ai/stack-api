import { afterEach, describe, expect, test } from "vitest";

import { Env } from "../env";

const held = process.env.PROBE;

afterEach(() =>
{
    if (held === undefined)
    {
        delete process.env.PROBE;
        return;
    }

    process.env.PROBE = held;
});

describe("a number read from the environment", () =>
{
    test("is refused when it is only a space, rather than read as zero", () =>
    {
        process.env.PROBE = "  ";

        expect(() => Env.number("PROBE", 1)).toThrow(/PROBE/);
    });

    test("and refused when it is not a whole number at all", () =>
    {
        for (const wrong of ["abc", "-1", "1.5", "1e999"])
        {
            process.env.PROBE = wrong;

            expect(() => Env.number("PROBE", 1)).toThrow(/PROBE/);
        }
    });

    test("but read when it is one", () =>
    {
        process.env.PROBE = "3000";

        expect(Env.number("PROBE", 1)).toBe(3000);
    });
});

describe("a list read from the environment", () =>
{
    test("means nothing allowed when it is set and empty", () =>
    {
        process.env.PROBE = "";

        expect(Env.list("PROBE")).toEqual([]);
    });

    test("and drops the gaps a trailing comma leaves", () =>
    {
        process.env.PROBE = "a, b, ,";

        expect(Env.list("PROBE")).toEqual(["a", "b"]);
    });
});
