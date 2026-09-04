import { afterEach, describe, expect, test } from "vitest";

import { caller, nobody, serving, type Serving } from "./serving";

let api: Serving;

afterEach(async () =>
{
    await api.stop();
});

async function added(shop: string, name: string): Promise<string>
{
    const answer = await api.kernel.handle({
        method: "POST",
        path: "/catalog/products",
        input: { name, cents: 1000 },
        caller: caller(shop),
    });

    return (answer.body as { id: string }).id;
}

describe("what a shop may reach", () =>
{
    test("answers only its own products", async () =>
    {
        api = await serving();

        await added("acme", "Ours");
        await added("other", "Theirs");

        const answer = await api.kernel.handle({
            method: "GET",
            path: "/catalog/products",
            input: {},
            caller: caller("acme"),
        });

        expect(answer.body).toMatchObject({ products: [{ name: "Ours" }] });
    });

    test("answers 404 for another shop's real id, as for one that never existed", async () =>
    {
        api = await serving();

        const theirs = await added("other", "Theirs");

        const answer = await api.kernel.handle({
            method: "GET",
            path: "/catalog/products/:id",
            input: { id: theirs },
            caller: caller("acme"),
        });

        expect(answer.status).toBe(404);
    });

    test("writes a product into the caller's shop, whatever the body says", async () =>
    {
        api = await serving();

        const mine = await added("acme", "Ours");

        const seen = await api.kernel.handle({
            method: "GET",
            path: "/catalog/products/:id",
            input: { id: mine },
            caller: caller("other"),
        });

        expect(seen.status).toBe(404);
    });

    test("refuses a caller carrying no shop, rather than defaulting", async () =>
    {
        api = await serving();

        const answer = await api.kernel.handle({
            method: "GET",
            path: "/catalog/products",
            input: {},
            caller: nobody(),
        });

        expect(answer.status).toBe(403);
    });
});
