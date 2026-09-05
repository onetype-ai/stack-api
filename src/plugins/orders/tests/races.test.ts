import { afterEach, describe, expect, test } from "vitest";

import { caller, serving, type Serving } from "./serving";

const PAYMENTS = "https://payments.example.test";

let api: Serving;
let charges = 0;
let clock = 1_700_000_000_000;

afterEach(async () =>
{
    await api.stop();
    charges = 0;
    clock = 1_700_000_000_000;
});

async function listed(who: ReturnType<typeof caller>): Promise<string>
{
    const made = await api.kernel.handle({
        method: "POST",
        path: "/catalog/products",
        input: { name: `P ${crypto.randomUUID()}`, cents: 2500 },
        caller: who,
    });

    const product = made.body as { id: string };

    await api.kernel.handle({
        method: "PATCH",
        path: "/catalog/products/:id",
        input: { id: product.id, status: "listed" },
        caller: who,
    });

    return product.id;
}

async function reserved(who: ReturnType<typeof caller>): Promise<string>
{
    const held = await api.kernel.handle({
        method: "POST",
        path: "/orders",
        input: { productId: await listed(who), quantity: 1 },
        caller: who,
    });

    return (held.body as { id: string }).id;
}

function counting(): (call: { url: string }) => unknown
{
    return () =>
    {
        charges += 1;

        return { paid: true, reference: "r" };
    };
}

describe("an order paid from two places at once", () =>
{
    test("is charged once, whatever the timing", async () =>
    {
        api = await serving({ payments: PAYMENTS }, undefined, counting());

        const who = caller("acme");
        const id = await reserved(who);

        const pay = (): Promise<unknown> => api.kernel.handle({
            method: "POST", path: "/orders/:id/pay", input: { id }, caller: who,
        });

        await Promise.all([pay(), pay()]);

        expect(charges).toBe(1);
    });

    test("and cannot be paid after it was cancelled", async () =>
    {
        api = await serving({ payments: PAYMENTS }, undefined, counting());

        const who = caller("acme");
        const id = await reserved(who);

        await Promise.all([
            api.kernel.handle({ method: "POST", path: "/orders/:id/pay", input: { id }, caller: who }),
            api.kernel.handle({ method: "DELETE", path: "/orders/:id", input: { id }, caller: who }),
        ]);

        const seen = await api.kernel.handle({ method: "GET", path: "/orders", input: {}, caller: who });
        const row = (seen.body as { orders: { id: string; status: string }[] }).orders.find((one) => one.id === id);

        expect(["paid", "cancelled"]).toContain(row?.status);
        expect(charges).toBe(row?.status === "paid" ? 1 : 0);
    });
});

describe("releasing holds that have run out", () =>
{
    test("leaves another shop's reservations alone", async () =>
    {
        api = await serving({ holdSeconds: 600 }, () => clock);

        const acme = caller("acme");
        const other = caller("other", undefined, "22222222-2222-4222-8222-222222222222");

        // Both are old enough. The sweep runs on schedule, once per shop, with
        // nobody calling it.
        await reserved(acme);
        const theirs = await reserved(other);

        clock += 601_000;

        await api.due();

        const seen = await api.kernel.handle({ method: "GET", path: "/orders", input: {}, caller: other });
        const row = (seen.body as { orders: { id: string; status: string }[] }).orders.find((one) => one.id === theirs);

        expect(row?.status).toBe("expired");
    });

    test("and refuses a caller reaching for a shop that is not theirs", async () =>
    {
        api = await serving({ holdSeconds: 600 }, () => clock);

        await expect(api.kernel.run("orders.release-holds", { shopId: "other" }, caller("acme"))).rejects.toThrow();
        await expect(api.kernel.run("orders.release-holds", {}, caller("acme"))).rejects.toThrow();
    });
});

describe("reserving a product", () =>
{
    test("refuses one taken off the shelves while the request was in flight", async () =>
    {
        api = await serving({ payments: PAYMENTS }, undefined, counting());

        const who = caller("acme");
        const product = await listed(who);

        const [held] = await Promise.all([
            api.kernel.handle({ method: "POST", path: "/orders", input: { productId: product, quantity: 1 }, caller: who }),
            api.kernel.handle({ method: "PATCH", path: "/catalog/products/:id", input: { id: product, status: "withdrawn" }, caller: who }),
        ]);

        if (held.status !== 201)
        {
            return;
        }

        const id = (held.body as { id: string }).id;
        const paid = await api.kernel.handle({ method: "POST", path: "/orders/:id/pay", input: { id }, caller: who });

        expect(paid.status).not.toBe(201);
    });
});

describe("a hold whose moment has passed", () =>
{
    test("is not counted as reserved, swept or not", async () =>
    {
        api = await serving({ holdSeconds: 600 }, () => clock);

        const who = caller("acme");

        await reserved(who);

        clock += 601_000;

        const seen = await api.kernel.handle({ method: "GET", path: "/orders", input: {}, caller: who });

        expect((seen.body as { reserved: number }).reserved).toBe(0);
    });
});

describe("a card the bank refused", () =>
{
    test("does not put back a hold the sweep already let go of", async () =>
    {
        api = await serving({ payments: PAYMENTS, holdSeconds: 600 }, () => clock, () =>
        {
            clock += 601_000;

            throw new Error("the bank said no");
        });

        const who = caller("acme");
        const id = await reserved(who);

        await api.kernel.handle({ method: "POST", path: "/orders/:id/pay", input: { id }, caller: who });

        const seen = await api.kernel.handle({ method: "GET", path: "/orders", input: {}, caller: who });
        const row = (seen.body as { orders: { id: string; status: string }[] }).orders.find((one) => one.id === id);

        expect(row?.status).not.toBe("reserved");
    });
});
