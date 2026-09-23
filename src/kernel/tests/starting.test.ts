import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseEnv } from "node:util";

import { afterEach, expect, test } from "vitest";

import { startTestKernel, Started } from "@onetype/stack-api-kit/testing";

import { Plugins } from "../plugins";
import { Settings } from "../settings";

import type { TestKernel } from "@onetype/stack-api-kit/testing";

let api: TestKernel | undefined;

afterEach(async () =>
{
    await api?.stop();
    api = undefined;
});

// Every plugin with every migration boots here, which takes seconds on a busy machine: past vitest's default 5 s.
const BOOT_MS = 60_000;

test("every plugin this project ships starts together, and holds to every rule a running kernel is checked by (given a minute: it boots every plugin and migration)", async () =>
{
    const plugins = await Plugins.discover();
    const environment = parseEnv(readFileSync(join(import.meta.dirname, "boot.env"), "utf8"));

    // With everything a deployed process may turn on. The outbox above all: an event emitted outside a
    // transaction is refused only when it is on, so a boot without it passes what production refuses.
    api = await startTestKernel({ plugins, config: Settings.configFor(plugins, environment), outbox: true, schedule: true, sockets: true });

    expect(api.kernel.started()).toBe(true);
    expect(Started.findAll(api.kernel).map((problem) => `[${problem.check}] ${problem.message}`)).toEqual([]);
}, BOOT_MS);

test("a checkout with no src/plugins starts, because git keeps no empty folder and a fresh clone has none", async () =>
{
    api = await startTestKernel({ plugins: [] });

    expect(api.kernel.started()).toBe(true);
    expect(api.kernel.routes()).toEqual([]);
});
