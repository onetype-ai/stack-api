import { afterEach, expect, test } from "vitest";

import { startTestKernel, Started } from "@onetype/stack-api-kit/testing";

import { Plugins } from "../plugins";

import type { TestKernel } from "@onetype/stack-api-kit/testing";

let api: TestKernel | undefined;

afterEach(async () =>
{
    await api?.stop();
    api = undefined;
});

test("every plugin this project ships starts together, and holds to every rule a running kernel is checked by", async () =>
{
    api = await startTestKernel({ plugins: await Plugins.discover() });

    expect(api.kernel.started()).toBe(true);
    expect(Started.findAll(api.kernel).map((problem) => `[${problem.check}] ${problem.message}`)).toEqual([]);
});
