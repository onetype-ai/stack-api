import { describe, expect, test } from "vitest";

import { caller, startApi } from "./setup";

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
    test("and a word written in two alphabets is refused, not quietly doubled", async () =>
    {
        const api = await startApi();

        const add = (name: string): Promise<{ status: number }> => api.kernel.handle({
            method: "POST", path: "/catalog/products", input: { name, cents: 100 }, caller: caller(),
        });

        /* One letter pretending to be another, inside one word. */
        expect((await add("Widgеt")).status).toBe(400);
        expect((await add("Sοap")).status).toBe(400);
        expect((await add("ᎠPPLE")).status).toBe(400);

        /* What shops sell: a brand in one alphabet beside a word in another. */
        expect((await add("iPhone 15 Про")).status).toBe(201);
        expect((await add("Nike Παπούτσια")).status).toBe(201);
        expect((await add("Рок")).status).toBe(201);
        expect((await add("Pok")).status).toBe(201);

        await api.stop();
    });

    test("and a joiner that holds a word together is kept", () =>
    {
        expect(Text.visible("👨‍👩‍👧")).toBe("👨‍👩‍👧");
        expect(Text.visible("می‌رود")).toBe("می‌رود");
        expect(Text.visible("100 km")).toBe("100 km");
    });

    test("and letters tied into one glyph are the letters they hold", () =>
    {
        expect(Text.same("Oﬃce")).toBe(Text.same("Office"));
        expect(Text.same("waﬄe")).toBe(Text.same("waffle"));
    });

    test("whatever the character that hid it", () =>
    {
        expect(Text.same("Wid؜get")).toBe(Text.same("Widget"));
        expect(Text.same("Wid\u{E0061}get")).toBe(Text.same("Widget"));
    });


});

describe("what a name costs to store", () =>
{
    test("is counted, and not only what a reader sees", () =>
    {
        const marked = `a${"́".repeat(3000)}`;

        expect(Text.characters(marked)).toBe(1);
        expect(Text.units(marked)).toBeGreaterThan(120);
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
        const api = await startApi();

        await api.kernel.handle({
            method: "POST",
            path: "/catalog/products",
            input: { name: "A real product", cents: 100 },
            caller: caller(),
        });

        const rows = await api.kernel.handle({
            method: "GET",
            path: "/catalog/search",
            input: { text: " " },
            caller: caller(),
        });

        expect((rows.body as { products: unknown[] }).products).toEqual([]);

        await api.stop();
    });
});
