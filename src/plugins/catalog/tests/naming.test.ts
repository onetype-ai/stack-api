import { describe, expect, test } from "vitest";

import { caller, serving } from "./serving";

import { Ordering } from "@utils/Ordering";
import { Text } from "@utils/Text";

describe("two names that read differently", () =>
{
    test("stay different, whatever they decompose into", () =>
    {
        expect(Text.same("Model 2")).not.toBe(Text.same("Model ²"));
        expect(Text.same("Mark IX")).not.toBe(Text.same("Mark Ⅸ"));
        expect(Text.same("5 kg")).not.toBe(Text.same("5 ㎏"));
    });
});

describe("two names that read the same", () =>
{
    test("are one name across widths and alphabets", () =>
    {
        expect(Text.same("Ｗidget")).toBe(Text.same("Widget"));
        expect(Text.same("Widgеt")).toBe(Text.same("Widget"));
    });

    test("and a joiner that holds a word together is kept", () =>
    {
        expect(Text.visible("👨‍👩‍👧")).toBe("👨‍👩‍👧");
        expect(Text.visible("می‌رود")).toBe("می‌رود");
    });

    test("are the same name, however they were typed", () =>
    {
        expect(Text.same("Wid​get")).toBe(Text.same("Widget"));
        expect(Text.same("Wid‎get")).toBe(Text.same("Widget"));
        expect(Text.same("Wid­get")).toBe(Text.same("Widget"));
    });

    test("and a name that only orders itself backwards is not a new one", () =>
    {
        expect(Text.same("Safe‮gnp.exe")).toBe(Text.same("Safegnp.exe"));
    });
});

describe("what a name costs to store", () =>
{
    test("is counted, and not only what a reader sees", () =>
    {
        const one = `a${"́".repeat(3000)}`;

        expect(Text.characters(one)).toBe(1);
        expect(Text.units(one)).toBeGreaterThan(120);
    });
});

describe("searching for nothing", () =>
{
    test("is not a search for everything", () =>
    {
        expect(Text.searched(" ")).toBe("");
        expect(Text.searched("́")).toBe("");
    });
});

describe("a locale nobody could read", () =>
{
    test("is refused, not answered with a broken server", () =>
    {
        expect(() => Ordering.by("!!")).not.toThrow();
        expect(() => Ordering.by("en_US")).not.toThrow();
        expect(() => Ordering.by("--")).not.toThrow();
    });
});

describe("a search that folds away to nothing", () =>
{
    test("answers nothing, not everything", async () =>
    {
        const api = await serving();

        await api.kernel.handle({
            method: "POST",
            path: "/catalog/products",
            input: { name: "A real product", cents: 100 },
            caller: caller(),
        });

        const found = await api.kernel.handle({
            method: "GET",
            path: "/catalog/search",
            input: { text: " " },
            caller: caller(),
        });

        expect((found.body as { products: unknown[] }).products).toEqual([]);

        await api.stop();
    });
});
