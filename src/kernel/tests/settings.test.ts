import { afterEach, describe, expect, test } from "vitest";
import { z } from "zod";

import { definePlugin } from "@onetype/stack-api-kit";
import { startTestKernel } from "@onetype/stack-api-kit/testing";

import { Settings } from "../settings";

import type { TestKernel } from "@onetype/stack-api-kit/testing";

const SECRET = "sk-live-do-not-print-me";

const mailer = definePlugin("mailer", {
    version: "1.0.0",
    describe: "A plugin holding a secret and a number.",
    config: z.object({
        apiKey: z.string().min(32),
        timeoutSeconds: z.coerce.number().int().default(30),
    }),
});

const crawler = definePlugin("web-crawler", {
    version: "1.0.0",
    describe: "A plugin whose name holds a hyphen.",
    config: z.object({ baseURL: z.url() }),
});

const quiet = definePlugin("quiet", {
    version: "1.0.0",
    describe: "A plugin with no config.",
});

let api: TestKernel | undefined;

afterEach(async () =>
{
    await api?.stop();
    api = undefined;
});

const refusalOf = (run: () => unknown): string =>
{
    try
    {
        run();
    }
    catch (cause)
    {
        return cause instanceof Error ? cause.message : String(cause);
    }

    throw new Error("Expected Settings.configFor to refuse, and it answered.");
};

describe("plugin config read from the environment", () =>
{
    test("each field is read from <PLUGIN>__<FIELD>, as the string it arrived as", () =>
    {
        const environment = { MAILER__API_KEY: "k".repeat(32), MAILER__TIMEOUT_SECONDS: "45", WEB_CRAWLER__BASE_URL: "https://example.com" };

        const config = Settings.configFor([mailer, crawler, quiet], environment);

        expect(config).toEqual({
            mailer: { apiKey: "k".repeat(32), timeoutSeconds: "45" },
            "web-crawler": { baseURL: "https://example.com" },
        });
    });

    test("a started kernel hands the plugin its config, parsed by its own schema", async () =>
    {
        const config = Settings.configFor([mailer], { MAILER__API_KEY: "k".repeat(32) });

        api = await startTestKernel({ plugins: [mailer], config });

        expect(api.kernel.context("mailer").config).toEqual({ apiKey: "k".repeat(32), timeoutSeconds: 30 });
    });

    test("a missing variable is refused, naming the plugin and the variable", () =>
    {
        const message = refusalOf(() => Settings.configFor([mailer], {}));

        expect(message).toContain(`Plugin "mailer" refuses MAILER__API_KEY`);
    });

    test("a refused value is named by its variable and never printed", () =>
    {
        const message = refusalOf(() => Settings.configFor([mailer], { MAILER__API_KEY: SECRET }));

        expect(message).toContain("MAILER__API_KEY");
        expect(message).not.toContain(SECRET);
    });

    test("a schema that throws is refused like any other, and what it threw is never repeated", () =>
    {
        const parsing = definePlugin("parsing", {
            version: "1.0.0",
            describe: "Config parsed by a transform that throws.",
            config: z.object({ headers: z.string().transform((raw): unknown => JSON.parse(raw)) }),
        });

        const message = refusalOf(() => Settings.configFor([parsing, mailer], { PARSING__HEADERS: `{"token":"${SECRET}"` }));

        expect(message).toContain(`Plugin "parsing" refuses its config (PARSING__HEADERS): its schema threw`);
        expect(message).toContain("MAILER__API_KEY");
        expect(message).not.toContain(SECRET);
    });

    test("a variable no field reads is refused, listing the ones that are read", () =>
    {
        const message = refusalOf(() => Settings.configFor([mailer], { MAILER__API_KEY: "k".repeat(32), MAILER__APIKEY: "k" }));

        expect(message).toContain(`MAILER__APIKEY is not a config field of plugin "mailer", which reads MAILER__API_KEY, MAILER__TIMEOUT_SECONDS`);
    });

    test("a variable for a plugin declaring no config is refused", () =>
    {
        const message = refusalOf(() => Settings.configFor([quiet], { QUIET__LEVEL: "1" }));

        expect(message).toContain(`QUIET__LEVEL is set, but plugin "quiet" declares no config`);
    });

    test("config that is not a z.object is refused, since no variable can reach it", () =>
    {
        const scalar = definePlugin("scalar", { version: "1.0.0", describe: "Config as a bare string.", config: z.string() });

        const message = refusalOf(() => Settings.configFor([scalar], {}));

        expect(message).toContain(`Plugin "scalar" declares config that is not a z.object`);
    });

    test("two fields reading one variable are refused", () =>
    {
        const twice = definePlugin("twice", {
            version: "1.0.0",
            describe: "Two spellings of one field.",
            config: z.object({ apiKey: z.string().optional(), api_key: z.string().optional() }),
        });

        const message = refusalOf(() => Settings.configFor([twice], {}));

        expect(message).toContain(`fields "apiKey" and "api_key", which both read TWICE__API_KEY`);
    });

    test("every problem is reported in one refusal, not the first alone", () =>
    {
        const message = refusalOf(() => Settings.configFor([mailer, crawler], {}));

        expect(message).toContain("MAILER__API_KEY");
        expect(message).toContain("WEB_CRAWLER__BASE_URL");
    });

    test("a variable belonging to no plugin is left alone", () =>
    {
        const config = Settings.configFor([quiet], { SOMEONE_ELSE__TOKEN: "x" });

        expect(config).toEqual({});
    });
});
