import { describe, expect, test } from "vitest";
import { z } from "zod";

import { definePlugin } from "@onetype/stack-api-kit";

import { Settings } from "../settings";

const SECRET = "sk-live-do-not-print-me";

const plugin = (name: string, config?: z.ZodType) => definePlugin(name, { version: "1.0.0", describe: "A plugin under test.", ...(config === undefined ? {} : { config }) });

const mailer = plugin("mailer", z.object({ apiKey: z.string().min(32), timeoutSeconds: z.coerce.number().int().default(30) }));
const crawler = plugin("web-crawler", z.object({ baseURL: z.url() }));
const quiet = plugin("quiet");
const parsing = plugin("parsing", z.object({ headers: z.string().transform((raw): unknown => JSON.parse(raw)) }));
const scalar = plugin("scalar", z.string());
const twice = plugin("twice", z.object({ apiKey: z.string().optional(), api_key: z.string().optional() }));

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
    test("each field is read from <PLUGIN>__<FIELD> as the string it arrived as, and variables of no plugin are left alone", () =>
    {
        const environment = { MAILER__API_KEY: "k".repeat(32), MAILER__TIMEOUT_SECONDS: "45", WEB_CRAWLER__BASE_URL: "https://example.com", SOMEONE_ELSE__TOKEN: "x" };

        const config = Settings.configFor([mailer, crawler, quiet], environment);

        expect(config).toEqual({
            mailer: { apiKey: "k".repeat(32), timeoutSeconds: "45" },
            "web-crawler": { baseURL: "https://example.com" },
        });
    });

    test.each([
        ["a missing variable", [mailer], {}, `Plugin "mailer" refuses MAILER__API_KEY`],
        ["a variable no field reads", [mailer], { MAILER__API_KEY: "k".repeat(32), MAILER__APIKEY: "k" }, `MAILER__APIKEY is not a config field of plugin "mailer", which reads MAILER__API_KEY, MAILER__TIMEOUT_SECONDS`],
        ["a variable for a plugin with no config", [quiet], { QUIET__LEVEL: "1" }, `QUIET__LEVEL is set, but plugin "quiet" declares no config`],
        ["config that is not a z.object", [scalar], {}, `Plugin "scalar" declares config that is not a z.object`],
        ["two fields reading one variable", [twice], {}, `fields "apiKey" and "api_key", which both read TWICE__API_KEY`],
    ] as const)("refuses %s, naming the plugin, the variable and the fix", (_what, plugins, environment, expected) =>
    {
        const message = refusalOf(() => Settings.configFor(plugins, environment));

        expect(message).toContain(expected);
    });

    test("reports every problem in one refusal, and never prints a refused value, even one a schema threw on", () =>
    {
        const message = refusalOf(() => Settings.configFor([parsing, mailer, crawler], { PARSING__HEADERS: `{"token":"${SECRET}"`, MAILER__API_KEY: SECRET }));

        expect(message).toContain(`Plugin "parsing" refuses its config (PARSING__HEADERS): its schema threw`);
        expect(message).toContain("MAILER__API_KEY");
        expect(message).toContain("WEB_CRAWLER__BASE_URL");
        expect(message).not.toContain(SECRET);
    });
});
