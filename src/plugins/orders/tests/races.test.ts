import { afterEach, describe, expect, test } from "vitest";

import { eq } from "drizzle-orm";

import { orders } from "../tables/orders";

import { caller, listed, reserved, serving, type Serving } from "./serving";

import type { Inside } from "../types/Context";

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

const who = caller("acme");

function counting(): () => unknown
{
    return () =>
    {
        charges += 1;

        return { paid: true, reference: "r" };
    };
}

function pay(id: string): Promise<{ status: number }>
{
    return api.kernel.handle({ method: "POST", path: "/orders/:id/pay", input: { id }, caller: who });
}

function seen(): Promise<{ body: unknown }>
{
    return api.kernel.handle({ method: "GET", path: "/orders", input: {}, caller: who });
}

async function status(id: string): Promise<string | undefined>
{
    const inside = api.kernel.context("orders", who) as unknown as Inside;
    const [row] = await inside.db.select().from(orders).where(eq(orders.id, id));

    return row?.status;
}


describe("an order paid from two places at once", () =>
{
    test("is charged once, whatever the timing", async () =>
    {
        api = await serving({ payments: PAYMENTS }, undefined, counting());

        const id = await reserved(api, who);

        await Promise.all([pay(id), pay(id)]);

        expect(charges).toBe(1);
    });

    test("and cannot be paid after it was cancelled", async () =>
    {
        api = await serving({ payments: PAYMENTS }, undefined, counting());

        const id = await reserved(api, who);

        await Promise.all([
            api.kernel.handle({ method: "POST", path: "/orders/:id/pay", input: { id }, caller: who }),
            api.kernel.handle({ method: "DELETE", path: "/orders/:id", input: { id }, caller: who }),
        ]);

        const answer = await seen();
        const row = (answer.body as { orders: { id: string; status: string }[] }).orders.find((one) => one.id === id);

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
        await reserved(api, acme);
        const theirs = await reserved(api, other);

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

        const product = await listed(api, who);

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

describe("a card the bank refused", () =>
{
    test("does not put back a hold the sweep already let go of", async () =>
    {
        api = await serving({ payments: PAYMENTS, holdSeconds: 600 }, () => clock, () =>
        {
            clock += 601_000;

            throw new Error("the bank said no");
        });

        const id = await reserved(api, who);

        await api.kernel.handle({ method: "POST", path: "/orders/:id/pay", input: { id }, caller: who });

        // The row itself: what a shop is shown hides an expired hold, which
        // would hide a row left saying paid.
        expect(await status(id)).toBe("expired");
    });

    test("and leaves nothing marked paid that nobody was charged for", async () =>
    {
        api = await serving({ payments: PAYMENTS, holdSeconds: 600 }, () => clock, () =>
        {
            charges += 1;

            throw new Error("the bank said no");
        });

        const id = await reserved(api, who);

        await api.kernel.handle({ method: "POST", path: "/orders/:id/pay", input: { id }, caller: who });

        const answer = await seen();
        const row = (answer.body as { orders: { id: string; status: string }[] }).orders.find((one) => one.id === id);

        expect(row?.status).toBe("reserved");
    });
});

describe("what a shop is shown", () =>
{
    test("says the same thing in the count and in the rows", async () =>
    {
        api = await serving({ holdSeconds: 600 }, () => clock);

        const id = await reserved(api, who);

        clock += 601_000;

        const seen = await api.kernel.handle({ method: "GET", path: "/orders", input: {}, caller: who });
        const answer = seen.body as { reserved: number; orders: { id: string; status: string }[] };
        const row = answer.orders.find((one) => one.id === id);

        expect([answer.reserved, row?.status]).toEqual([0, "expired"]);
    });
});

describe("a slow refusal", () =>
{
    test("does not rewind a payment somebody else completed", async () =>
    {
        let first = true;

        api = await serving({ payments: PAYMENTS, holdSeconds: 600 }, () => clock, async () =>
        {
            if (first)
            {
                first = false;

                await new Promise((keep) => setTimeout(keep, 20));

                throw new Error("the bank said no, eventually");
            }

            charges += 1;

            return { paid: true, reference: "r" };
        });

        const id = await reserved(api, who);
        const slowly = pay(id);

        await new Promise((keep) => setTimeout(keep, 5));

        // The first payer is still waiting on the bank, so put the order back
        // the way its compensation would and let a second payer win it.
        const inside = api.kernel.context("orders", who) as unknown as Inside;

        await inside.db.update(orders).set({ status: "reserved", holdsUntil: clock + 600_000 }).where(eq(orders.id, id));

        const quickly = await pay(id);

        await slowly;

        expect([quickly.status, await status(id), charges]).toEqual([201, "paid", 1]);
    });
});
