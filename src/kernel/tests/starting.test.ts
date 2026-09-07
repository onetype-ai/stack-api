import { afterEach, describe, expect, test } from "vitest";

import { startTestKernel } from "@onetype/stack-api-kit/testing";

import { Plugins } from "../plugins";

import type { TestKernel } from "@onetype/stack-api-kit/testing";

let api: TestKernel | undefined;

afterEach(async () =>
{
    await api?.stop();
    api = undefined;
});

describe("every plugin this project ships, brought up together", () =>
{
    test("starts, which no single plugin's own tests prove", async () =>
    {
        api = await startTestKernel({ plugins: await Plugins.discover() });

        expect(api.kernel.started()).toBe(true);
    });

    test("and every permission a route needs is one some plugin may grant", async () =>
    {
        const plugins = await Plugins.discover();

        api = await startTestKernel({ plugins });

        const grantable = new Set(plugins.flatMap((plugin) => plugin.definition.mayGrant ?? []));

        const ungrantable = api.kernel.routes()
            .flatMap((route) => route.requires)
            .filter((permission) => !grantable.has(permission));

        expect(ungrantable).toEqual([]);
    });

    test("with a budget on every closed route, so none is unbounded", async () =>
    {
        api = await startTestKernel({ plugins: await Plugins.discover() });

        const unbounded = api.kernel.routes()
            .filter((route) => !route.public && route.limit === undefined)
            .map((route) => `${route.method} ${route.path}`);

        expect(unbounded).toEqual([]);
    });

    test("and no route reading a header that carries a credential", async () =>
    {
        api = await startTestKernel({ plugins: await Plugins.discover() });

        const credentialled = api.kernel.routes()
            .filter((route) => route.reads.some((name) => /cookie|authorization/i.test(name)))
            .map((route) => `${route.method} ${route.path}`);

        expect(credentialled).toEqual([]);
    });
});
