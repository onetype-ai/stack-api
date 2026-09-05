import { afterEach, describe, expect, test } from "vitest";

import { caller, startApi, type TestApi } from "./setup";

let api: TestApi;

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

    return (answer.body as { products: { name: string }[] }).products.map((product) => product.name);
}

describe("ordering", () =>
{
    test("puts an accented name where a reader expects it, not after Z", async () =>
    {
        api = await startApi({ locale: "de" });

        for (const name of ["Zebra", "Äpfel", "Apfel", "Österreich", "Ostern"])
        {
            await add(name);
        }

        expect(await named()).toEqual(["Apfel", "Äpfel", "Ostern", "Österreich", "Zebra"]);
    });

    test("orders Turkish the way Turkish is ordered", async () =>
    {
        api = await startApi({ locale: "tr" });

        for (const name of ["Simit", "Şeker", "Sucuk"])
        {
            await add(name);
        }

        expect(await named("tr")).toEqual(["Simit", "Sucuk", "Şeker"]);
    });

    /* A tag naming its script gets that order; the stack picks none. */
    test("orders by the script the caller named", async () =>
    {
        api = await startApi({ locale: "sr-Latn" });

        for (const name of ["Cvet", "Ćuprija", "Čvor"])
        {
            await add(name);
        }

        expect(await named("sr-Latn")).toEqual(["Cvet", "Čvor", "Ćuprija"]);
    });

    test("and falls back to English rather than failing on a tag it cannot read", async () =>
    {
        api = await startApi();

        for (const name of ["Beta", "Alpha"])
        {
            await add(name);
        }

        expect(await named("!!")).toEqual(["Alpha", "Beta"]);
    });
});

describe("matching", () =>
{
    test("finds an accented name from an unaccented search", async () =>
    {
        api = await startApi();

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
        api = await startApi();

        expect(await add("Über")).toBe(201);
        expect(await add("ÜBER")).toBe(409);
    });

    test("but lets two real words coexist, accents and all", async () =>
    {
        api = await startApi();

        expect(await add("Apfel")).toBe(201);
        expect(await add("Äpfel")).toBe(201);
    });

    /* A ligature folds, but the fold that joins "Model 2" and "Model ²" does not. */
    test("refuses a name hidden behind characters that draw nothing", async () =>
    {
        api = await startApi();

        expect(await add("Office")).toBe(201);
        expect(await add("Offi\u200Bce")).toBe(409);
    });

    test("but keeps two names a reader can tell apart", async () =>
    {
        api = await startApi();

        expect(await add("Model 2")).toBe(201);
        expect(await add("Model ²")).toBe(201);
    });
});

describe("length", () =>
{
    test("counts characters a reader sees, not the units that hold them", async () =>
    {
        api = await startApi();

        expect(await add("👨‍👩‍👧‍👦".repeat(20))).toBe(201);
        expect(await add("あ".repeat(121))).toBe(400);
    });
});
