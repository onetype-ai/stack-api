import { afterEach, describe, expect, test } from "vitest";

import { caller, startApi, type TestApi } from "./setup";

let api: TestApi;

afterEach(async () =>
{
    await api.stop();
});

async function aProduct(): Promise<string>
{
    const answer = await api.kernel.handle({
        method: "POST",
        path: "/catalog/products",
        input: { name: `P ${crypto.randomUUID()}`, cents: 100 },
        caller: caller(),
    });

    return (answer.body as { id: string }).id;
}

function moved(id: string, status: string): Promise<{ status: number }>
{
    return api.kernel.handle({
        method: "PATCH",
        path: "/catalog/products/:id",
        input: { id, status },
        caller: caller(),
    });
}

describe("a product's life", () =>
{
    test("does not run backwards once it has left the shelves", async () =>
    {
        api = await startApi();

        const id = await aProduct();

        expect((await moved(id, "listed")).status).toBe(200);
        expect((await moved(id, "withdrawn")).status).toBe(200);
        expect((await moved(id, "listed")).status).toBe(409);
    });

    test("but a shop may drop a draft it never put up", async () =>
    {
        api = await startApi();

        expect((await moved(await aProduct(), "withdrawn")).status).toBe(200);
    });

    test("and the command that drops every draft still works", async () =>
    {
        api = await startApi();

        await aProduct();
        await aProduct();

        await api.kernel.run("catalog.withdraw-drafts", {}, caller());

        const answer = await api.kernel.handle({
            method: "GET",
            path: "/catalog/products",
            input: { status: "draft" },
            caller: caller(),
        });

        expect((answer.body as { products: unknown[] }).products).toEqual([]);
    });
});

describe("a shop's limit", () =>
{
    test("holds when everything arrives at once", async () =>
    {
        api = await startApi({ maxPerShop: 3 });

        const adding = Array.from({ length: 10 }, () => api.kernel.handle({
            method: "POST",
            path: "/catalog/products",
            input: { name: `P ${crypto.randomUUID()}`, cents: 100 },
            caller: caller(),
        }));

        const answers = await Promise.all(adding);

        expect(answers.filter((answer) => answer.status === 201)).toHaveLength(3);
    });
});
