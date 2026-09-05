import { startTestKernel, createCaller } from "@onetype/stack-api-kit/testing";

import catalog from "../plugin";

import type { TestKernel, Caller } from "@onetype/stack-api-kit/testing";
import type { Config } from "../schemas/Config";
import type { Rows } from "../types/Rows";

export type TestApi = TestKernel;

export function startApi(config: Partial<Config> = {}, now?: () => number): Promise<TestApi>
{
    return startTestKernel({
        plugins: [catalog],
        config: { catalog: config },
        ...(now !== undefined && { now }),
    });
}

export function caller(
    shopId = "acme",
    permissions: readonly string[] = ["catalog.read", "catalog.write"],
    id = "11111111-1111-4111-8111-111111111111",
): Caller
{
    return createCaller(permissions, id, { shopId });
}

export function nobody(): Caller
{
    return createCaller(["catalog.read", "catalog.write"], "22222222-2222-4222-8222-222222222222");
}

export function rows(api: TestApi): Rows
{
    return api.kernel.context("catalog").db as Rows;
}
