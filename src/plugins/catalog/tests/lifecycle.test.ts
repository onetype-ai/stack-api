import { afterEach, describe, expect, test } from "vitest";

import { caller, serving, type Serving } from "./serving";

let api: Serving;

afterEach(async () =>
{
    await api.stop();
});

async function made(): Promise<string>
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
        api = await serving();

        const id = await made();

        expect((await moved(id, "listed")).status).toBe(200);
        expect((await moved(id, "withdrawn")).status).toBe(200);
        expect((await moved(id, "listed")).status).toBe(409);
    });

    test("and nothing is withdrawn that was never for sale", async () =>
    {
        api = await serving();

        expect((await moved(await made(), "withdrawn")).status).toBe(409);
    });
});

describe("a shop's limit", () =>
{
    test("holds when everything arrives at once", async () =>
    {
        api = await serving({ maxPerShop: 3 });

        const adding = Array.from({ length: 10 }, () => api.kernel.handle({
            method: "POST",
            path: "/catalog/products",
            input: { name: `P ${crypto.randomUUID()}`, cents: 100 },
            caller: caller(),
        }));

        const answers = await Promise.all(adding);

        expect(answers.filter((one) => one.status === 201)).toHaveLength(3);
    });
});
