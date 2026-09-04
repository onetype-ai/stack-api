import { booting, calling } from "@onetype/stack-api-kit/testing";

import catalog from "../plugin";

import type { Booted, Caller } from "@onetype/stack-api-kit/testing";
import type { Config } from "../schemas/Config";
import type { Rows } from "../types/Rows";

export type Serving = Booted;

export function serving(config: Partial<Config> = {}, now?: () => number): Promise<Serving>
{
    return booting({
        plugins: [catalog],
        config: { catalog: config },
        ...(now !== undefined && { now }),
    });
}

/** A caller of one shop. The claim is what every read narrows on. */
export function caller(
    shopId = "acme",
    permissions: readonly string[] = ["catalog.read", "catalog.write"],
    id = "11111111-1111-4111-8111-111111111111",
): Caller
{
    return calling(permissions, id, { shopId });
}

/** A caller carrying no shop at all. */
export function nobody(): Caller
{
    return calling(["catalog.read", "catalog.write"], "22222222-2222-4222-8222-222222222222");
}

/** This plugin's own tables, for arranging what no route can write. */
export function rows(api: Serving): Rows
{
    return api.kernel.context("catalog").db as Rows;
}
