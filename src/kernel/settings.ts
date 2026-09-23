import { Env, LEVELS } from "@onetype/stack-api-kit";
import { z } from "zod";

import type { Level, Plugin } from "@onetype/stack-api-kit";

export type Settings = {
    port: number;
    database: string;
    outbox: boolean;
    schedule: boolean;
    sockets: boolean;
    origins: readonly string[];
    bodyBytes: number;

    behindProxy: boolean;

    watchSeconds: number;
    logLevel: Level;
};

export type PluginConfig = Readonly<Record<string, Readonly<Record<string, string>>>>;

type Environment = Readonly<Record<string, string | undefined>>;

// Two underscores separate the plugin from the field, as ASP.NET Core and
// pydantic-settings do: a plugin name may itself hold a hyphen, which becomes one.
const SEPARATOR = "__";

export const Settings = {
    levels: LEVELS,

    read: (): Settings =>
    {
        return {
            port: Env.number("PORT", 7280, 1, 65_535),
            database: Env.text("DATABASE_FILE", "./data/app.db") ?? "./data/app.db",
            outbox: Env.flag("OUTBOX", true),
            schedule: Env.flag("SCHEDULE", false),
            sockets: Env.flag("SOCKETS", true),
            origins: Env.list("ORIGINS"),
            bodyBytes: Env.number("BODY_BYTES", 1_000_000, 1),
            behindProxy: Env.flag("BEHIND_PROXY", false),
            watchSeconds: Env.number("WATCH_SECONDS", 60),
            logLevel: Env.oneOf("LOG_LEVEL", Settings.levels, "info"),
        };
    },

    // Values are handed over as the strings they arrived as: `start` parses them
    // with the plugin's own schema, so parsing here too would apply a transform twice.
    // The parse below exists only to name the variable when the schema refuses one.
    configFor: (plugins: readonly Plugin[], environment: Environment = process.env): PluginConfig =>
    {
        const config: Record<string, Readonly<Record<string, string>>> = {};
        const problems: string[] = [];

        for (const plugin of plugins)
        {
            const prefix = Settings.prefixOf(plugin.name);
            const given = Object.keys(environment).filter((variable) => variable.startsWith(prefix)).sort();
            const schema = plugin.definition.config;

            if (schema === undefined)
            {
                problems.push(...given.map((variable) => `${variable} is set, but plugin "${plugin.name}" declares no config. Remove it, or declare config in src/plugins/${plugin.name}/plugin.ts.`));
                continue;
            }

            if (!(schema instanceof z.ZodObject))
            {
                problems.push(`Plugin "${plugin.name}" declares config that is not a z.object, so no environment variable can reach it. Declare it as z.object({ ... }).`);
                continue;
            }

            const variables = new Map<string, string>();

            for (const field of Object.keys(schema.shape))
            {
                const variable = prefix + Settings.variableOf(field);
                const taken = variables.get(variable);

                if (taken !== undefined)
                {
                    problems.push(`Plugin "${plugin.name}" has fields "${taken}" and "${field}", which both read ${variable}. Rename one.`);
                    continue;
                }

                variables.set(variable, field);
            }

            const values: Record<string, string> = {};

            for (const variable of given)
            {
                const field = variables.get(variable);
                const value = environment[variable];

                if (field === undefined)
                {
                    problems.push(`${variable} is not a config field of plugin "${plugin.name}", which reads ${[...variables.keys()].join(", ")}. Rename or remove it.`);
                }
                else if (value !== undefined)
                {
                    values[field] = value;
                }
            }

            let parsed: ReturnType<typeof schema.safeParse>;

            try
            {
                parsed = schema.safeParse(values);
            }
            catch
            {
                // A transform that throws escapes safeParse, and its error may quote the
                // value it was handed, so the cause is dropped rather than repeated.
                problems.push(`Plugin "${plugin.name}" refuses its config (${[...variables.keys()].join(", ")}): its schema threw while parsing. Make it report a zod issue instead of throwing.`);
                config[plugin.name] = values;
                continue;
            }

            if (!parsed.success)
            {
                const fieldsToVariables = new Map([...variables].map(([variable, field]) => [field, variable]));

                for (const issue of parsed.error.issues)
                {
                    const field = issue.path[0];
                    const variable = typeof field === "string" ? fieldsToVariables.get(field) : undefined;
                    const subject = variable ?? `its config (${[...variables.keys()].join(", ")})`;

                    problems.push(`Plugin "${plugin.name}" refuses ${subject}: ${issue.message}. Set it in the environment or .env.`);
                }
            }

            config[plugin.name] = values;
        }

        if (problems.length > 0)
        {
            throw new Error(`Plugin config from the environment is invalid:\n- ${problems.join("\n- ")}`);
        }

        return config;
    },

    prefixOf: (plugin: string): string =>
    {
        return plugin.toUpperCase().replaceAll("-", "_") + SEPARATOR;
    },

    variableOf: (field: string): string =>
    {
        return field
            .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
            .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
            .toUpperCase();
    },
};
