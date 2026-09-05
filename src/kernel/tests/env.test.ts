import { afterEach, describe, expect, test } from "vitest";

import { Env } from "../env";

const before = process.env.PROBE;

afterEach(() =>
{
    if (before === undefined)
    {
        delete process.env.PROBE;
        return;
    }

    process.env.PROBE = before;
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
        for (const bad of ["abc", "-1", "1.5", "1e999"])
        {
            process.env.PROBE = bad;

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

describe("a number that is legal to type", () =>
{
    test("is refused when it is not legal to mean", () =>
    {
        process.env.PROBE = "0";

        expect(() => Env.number("PROBE", 1, 1)).toThrow(/PROBE/);
        expect(() => Env.number("PROBE", 1, 1, 65_535)).toThrow(/PROBE/);
    });

    test("and refused when it is past what it may be", () =>
    {
        process.env.PROBE = "70000";

        expect(() => Env.number("PROBE", 1, 1, 65_535)).toThrow(/PROBE/);
    });

    test("but taken at either end of what it may be", () =>
    {
        process.env.PROBE = "1";

        expect(Env.number("PROBE", 3000, 1, 65_535)).toBe(1);

        process.env.PROBE = "65535";

        expect(Env.number("PROBE", 3000, 1, 65_535)).toBe(65_535);
    });
});
