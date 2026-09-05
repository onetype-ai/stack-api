import { afterEach, describe, expect, test } from "vitest";

import { caller, startApi, type TestApi } from "./setup";

const PAYMENTS = "https://payments.example.test";

let api: TestApi;

afterEach(async () =>
{
    await api.stop();
});

async function listed(cents = 2500): Promise<string>
{
    const created = await api.kernel.handle({
        method: "POST",
        path: "/catalog/products",
        input: { name: `A product ${crypto.randomUUID()}`, cents },
        caller: caller(),
    });

    const product = created.body as { id: string };

    await api.kernel.handle({
        method: "PATCH",
        path: "/catalog/products/:id",
        input: { id: product.id, status: "listed" },
        caller: caller(),
    });

    return product.id;
}

describe("the price comes from the plugin that owns it", () =>
{
    test("and never from the caller", async () =>
    {
        api = await startApi();

        const answer = await api.kernel.handle({
            method: "POST",
            path: "/orders",
            input: { productId: await listed(4200) },
            caller: caller(),
        });

        expect(answer.body).toMatchObject({ cents: 4200 });
    });

    test("so a product nobody listed cannot be ordered", async () =>
    {
        api = await startApi();

        const created = await api.kernel.handle({
            method: "POST",
            path: "/catalog/products",
            input: { name: "Still a draft", cents: 100 },
            caller: caller(),
        });

        const answer = await api.kernel.handle({
            method: "POST",
            path: "/orders",
            input: { productId: (created.body as { id: string }).id },
            caller: caller(),
        });

        expect(answer.status).toBe(409);
    });
});

describe("what it hears", () =>
{
    test("lets go of holds on a product that was removed", async () =>
    {
        api = await startApi();

        const product = await listed();

        await api.kernel.handle({ method: "POST", path: "/orders", input: { productId: product }, caller: caller() });

        await api.kernel.handle({
            method: "DELETE",
            path: "/catalog/products/:id",
            input: { id: product },
            caller: caller(),
        });

        await api.settled();

        const answer = await api.kernel.handle({ method: "GET", path: "/orders", input: {}, caller: caller() });

        expect(answer.body).toMatchObject({ reserved: 0 });
        expect(api.kernel.events.failures()).toEqual([]);
    });
});

describe("what it refuses in another plugin's hook", () =>
{
    test("a product priced at nothing", async () =>
    {
        api = await startApi();

        const answer = await api.kernel.handle({
            method: "POST",
            path: "/catalog/products",
            input: { name: "Free thing", cents: 0 },
            caller: caller(),
        });

        expect(answer.status).toBe(409);
        expect(JSON.stringify(answer.body)).toContain("sold for nothing");
    });
});

describe("the partner it dials", () =>
{
    test("is charged what the product costs", async () =>
    {
        api = await startApi({ payments: PAYMENTS }, undefined, () => ({ paid: true, reference: "r" }));

        const created = await api.kernel.handle({
            method: "POST",
            path: "/orders",
            input: { productId: await listed(1750) },
            caller: caller(),
        });

        const answer = await api.kernel.handle({
            method: "POST",
            path: "/orders/:id/pay",
            input: { id: (created.body as { id: string }).id },
            caller: caller(),
        });

        expect(answer.body).toMatchObject({ status: "paid" });

        expect(api.called()).toMatchObject([{ method: "POST", body: { cents: 1750 } }]);
    });

    test("and a refusal leaves the order unpaid", async () =>
    {
        api = await startApi(
            { payments: PAYMENTS },
            undefined,
            () => ({ paid: false, reference: "r" }),
        );

        const created = await api.kernel.handle({
            method: "POST",
            path: "/orders",
            input: { productId: await listed() },
            caller: caller(),
        });

        const answer = await api.kernel.handle({
            method: "POST",
            path: "/orders/:id/pay",
            input: { id: (created.body as { id: string }).id },
            caller: caller(),
        });

        expect(answer.status).toBe(402);

        const listing = await api.kernel.handle({ method: "GET", path: "/orders", input: {}, caller: caller() });

        expect(listing.body).toMatchObject({ reserved: 1 });
    });
});

describe("what the partner says is input", () =>
{
    test("an answer we cannot read refuses the payment, rather than believing it", async () =>
    {
        api = await startApi({ payments: PAYMENTS }, undefined, () => ({ ok: "sure" }));

        const created = await api.kernel.handle({
            method: "POST",
            path: "/orders",
            input: { productId: await listed() },
            caller: caller(),
        });

        const answer = await api.kernel.handle({
            method: "POST",
            path: "/orders/:id/pay",
            input: { id: (created.body as { id: string }).id },
            caller: caller(),
        });

        expect(answer.status).toBe(502);
    });

    test("a host the plugin never declared is refused before it is dialled", async () =>
    {
        api = await startApi({ payments: "https://evil.test" });

        const created = await api.kernel.handle({
            method: "POST",
            path: "/orders",
            input: { productId: await listed() },
            caller: caller(),
        });

        const answer = await api.kernel.handle({
            method: "POST",
            path: "/orders/:id/pay",
            input: { id: (created.body as { id: string }).id },
            caller: caller(),
        });

        expect(answer.status).toBe(500);
        expect(api.called()).toEqual([]);
    });
});
