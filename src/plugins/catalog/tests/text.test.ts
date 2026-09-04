import { afterEach, describe, expect, test } from "vitest";

import { caller, serving, type Serving } from "./serving";

let api: Serving;

afterEach(async () =>
{
    await api.stop();
});

async function add(name: string): Promise<number>
{
    const answer = await api.kernel.handle({
        method: "POST",
        path: "/catalog/products",
        input: { name, cents: 100 },
        caller: caller(),
    });

    return answer.status;
}

async function named(locale?: string): Promise<string[]>
{
    const answer = await api.kernel.handle({
        method: "GET",
        path: "/catalog/products",
        input: locale === undefined ? {} : { locale },
        caller: caller(),
    });

    return (answer.body as { products: { name: string }[] }).products.map((one) => one.name);
}

describe("ordering", () =>
{
    test("puts an accented name where a reader expects it, not after Z", async () =>
    {
        api = await serving({ locale: "de" });

        for (const name of ["Zebra", "Äpfel", "Apfel", "Österreich", "Ostern"])
        {
            await add(name);
        }

        expect(await named()).toEqual(["Apfel", "Äpfel", "Ostern", "Österreich", "Zebra"]);
    });

    test("orders Turkish the way Turkish is ordered", async () =>
    {
        api = await serving({ locale: "tr" });

        for (const name of ["Simit", "Şeker", "Sucuk"])
        {
            await add(name);
        }

        expect(await named("tr")).toEqual(["Simit", "Sucuk", "Şeker"]);
    });

    test("orders Serbian written in Latin, not in Cyrillic", async () =>
    {
        api = await serving({ locale: "sr" });

        for (const name of ["Cvet", "Ćuprija", "Čvor"])
        {
            await add(name);
        }

        expect(await named("sr")).toEqual(["Cvet", "Čvor", "Ćuprija"]);
    });
});

describe("matching", () =>
{
    test("finds an accented name from an unaccented search", async () =>
    {
        api = await serving();

        await add("Übergrößen");

        const answer = await api.kernel.handle({
            method: "GET",
            path: "/catalog/search",
            input: { text: "ubergrossen" },
            caller: caller(),
        });

        expect(answer.body).toMatchObject({ products: [{ name: "Übergrößen" }] });
    });
});

describe("uniqueness", () =>
{
    test("refuses a second name that differs only by case", async () =>
    {
        api = await serving();

        expect(await add("Über")).toBe(201);
        expect(await add("ÜBER")).toBe(409);
    });

    test("but lets two real words coexist, accents and all", async () =>
    {
        api = await serving();

        expect(await add("Apfel")).toBe(201);
        expect(await add("Äpfel")).toBe(201);
    });

    test("refuses a name written with a ligature to look different", async () =>
    {
        api = await serving();

        expect(await add("Office")).toBe(201);
        expect(await add("Oﬃce")).toBe(409);
    });
});

describe("length", () =>
{
    test("counts characters a reader sees, not the units that hold them", async () =>
    {
        api = await serving();

        expect(await add("👨‍👩‍👧‍👦".repeat(20))).toBe(201);
        expect(await add("あ".repeat(121))).toBe(400);
    });
});
