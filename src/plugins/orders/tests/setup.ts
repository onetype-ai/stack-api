import { startTestKernel, createCaller } from "@onetype/stack-api-kit/testing";
import catalog from "@plugins/catalog/plugin";

import orders from "../plugin";

import type { TestKernel, Caller, Outbound } from "@onetype/stack-api-kit/testing";
import type { Config } from "../schemas/Config";

export type TestApi = TestKernel;

export function startApi(
    config: Partial<Config> = {},
    now: () => number = () => 1_700_000_000_000,
    answers: (call: Outbound) => unknown = () => ({ paid: true, reference: "r" }),
): Promise<TestApi>
{
    return startTestKernel({
        plugins: [catalog, orders],
        config: { orders: config },
        schedule: true,
        answers,
        now,
    });
}

export function caller(
    shopId = "acme",
    permissions: readonly string[] = ["catalog.read", "catalog.write", "orders.read", "orders.write"],
    id = "11111111-1111-4111-8111-111111111111",
): Caller
{
    return createCaller(permissions, id, { shopId });
}

/** A product this shop sells, listed and ready to be ordered. */
export async function listed(api: TestApi, who = caller(), cents = 2500): Promise<string>
{
    const created = await api.kernel.handle({
        method: "POST",
        path: "/catalog/products",
        input: { name: `P ${crypto.randomUUID()}`, cents },
        caller: who,
    });

    const product = created.body as { id: string };

    await api.kernel.handle({
        method: "PATCH",
        path: "/catalog/products/:id",
        input: { id: product.id, status: "listed" },
        caller: who,
    });

    return product.id;
}

/** One of those, held for the caller. */
export async function reserved(api: TestApi, who = caller()): Promise<string>
{
    const created = await api.kernel.handle({
        method: "POST",
        path: "/orders",
        input: { productId: await listed(api, who) },
        caller: who,
    });

    return (created.body as { id: string }).id;
}
