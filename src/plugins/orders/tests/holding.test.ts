import { afterEach, describe, expect, test } from "vitest";

import { caller, serving, type Serving } from "./serving";

let api: Serving;
let clock = 1_700_000_000_000;

afterEach(async () =>
{
    await api.stop();
    clock = 1_700_000_000_000;
});

async function listed(who = caller()): Promise<string> 
{
    const made = await api.kernel.handle({
        method: "POST",
        path: "/catalog/products",
        input: { name: `A product ${crypto.randomUUID()}`, cents: 2500 },
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

async function reserved(who = caller()): Promise<{ id: string }>
{
    const answer = await api.kernel.handle({
        method: "POST",
        path: "/orders",
        input: { productId: await listed(who) },
        caller: who,
    });

    return answer.body as { id: string };
}

async function statusOf(id: string, who = caller()): Promise<string>
{
    const answer = await api.kernel.handle({ method: "GET", path: "/orders", input: {}, caller: who });
    const page = answer.body as { orders: { id: string; status: string }[] };

    return page.orders.find((order) => order.id === id)?.status ?? "gone";
}

describe("a hold", () =>
{
    test("stays while its moment has not passed", async () =>
    {
        api = await serving({ holdSeconds: 600 }, () => clock);

        const order = await reserved();

        clock += 599_000;

        await api.due();

        expect(await statusOf(order.id)).toBe("reserved");
    });

    test("is let go once it has", async () =>
    {
        api = await serving({ holdSeconds: 600 }, () => clock);

        const order = await reserved();

        clock += 601_000;

        await api.due();
        await api.settled();

        expect(await statusOf(order.id)).toBe("expired");
    });

    test("cannot be paid for once it has expired", async () =>
    {
        api = await serving({ holdSeconds: 600 }, () => clock);

        const order = await reserved();

        clock += 601_000;

        const answer = await api.kernel.handle({
            method: "POST",
            path: "/orders/:id/pay",
            input: { id: order.id },
            caller: caller(),
        });

        expect(answer.status).toBe(409);
    });
});
