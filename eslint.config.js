import js from "@eslint/js";
import tseslint from "typescript-eslint";

// A driver the kit already holds. Repeated into every block that sets
// no-restricted-imports, because a flat config replaces a rule rather than
// merging it: a later block naming the same rule silently drops what an
// earlier one forbade.
const holds = {
    group: ["better-sqlite3", "hono", "@hono/*"],
    allowTypeImports: true,
    message: "The kit already holds these: a plugin reaches the database through ctx.db and answers through a route, never a second connection or a server of its own. A driver the kit does not hold, such as a cache or a queue, is opened in setup, owned through ctx.owns, and closed in teardown.",
};

const boundary = (message, patterns) => ({
    "no-restricted-imports": [
        "error",
        { patterns: [...patterns.map((group) => ({ ...group, message })), holds] },
    ],
});

export default tseslint.config(
    {
        ignores: ["**/dist/**", "**/node_modules/**", "**/packages/**", "**/*.config.ts", "**/*.config.js"],
    },

    js.configs.recommended,
    ...tseslint.configs.strictTypeChecked,

    {
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            "@typescript-eslint/no-explicit-any": "error",
            "@typescript-eslint/no-floating-promises": "error",
            "@typescript-eslint/no-misused-promises": "error",
            "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "separate-type-imports" }],
            "@typescript-eslint/no-unnecessary-condition": "off",
            "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
            "no-console": "error",
            eqeqeq: ["error", "always"],
        },
    },

    {
        files: ["src/plugins/*/**/*.ts"],
        ignores: ["src/plugins/*/tests/**"],
        rules: boundary(
            "A plugin may only import another plugin through its public index: @plugins/<name>.",
            [{ group: ["@plugins/*/*", "@plugins/*/*/**"] }],
        ),
    },

    {
        // A test may boot a dependency it declared, which needs that
        // plugin's contract: `index.ts` is the public API, and a kernel takes
        // the plugin. Everything below the contract stays private.
        files: ["src/plugins/*/tests/**/*.ts"],
        rules: boundary(
            "A test may reach a plugin's contract at \"@plugins/<name>/plugin\", and nothing deeper. Whether it may reach that plugin at all is checked by Project.checks().",
            [{ group: ["@plugins/*/*/**", "@plugins/*/!(plugin)"] }],
        ),
    },

    {
        // Pure and domain-free is the whole definition. A util reaching a
        // plugin knows a domain; one reaching the kit wants a ctx, and a
        // thing that wants a ctx is a service, which belongs to a plugin.
        files: ["src/utils/**/*.ts", "src/plugins/*/utils/**/*.ts"],
        rules: {
            "no-restricted-imports": [
                "error",
                {
                    patterns: [{
                        group: ["@plugins/*", "@plugins/*/**", "@onetype/stack-api-kit", "@onetype/stack-api-kit/*"],
                        message: "A util is pure and domain-free: it takes values and answers values. Needing a plugin or a ctx means it is a service, and a service belongs to the plugin that owns it.",
                    }],
                },
            ],
        },
    },

    {
        files: ["src/plugins/**/*.ts"],
        ignores: ["src/plugins/**/tests/**"],
        rules: {
            "no-restricted-globals": [
                "error",
                { name: "fetch", message: "Go through ctx.fetch, which checks the host against what the plugin declared." },
            ],
        },
    },

    {
        files: ["src/kernel/**/*.ts", "src/main.ts"],
        rules: {
            "no-console": "off",
        },
    },

    {
        files: ["**/tests/**/*.ts", "**/*.test.ts"],
        rules: {
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-unsafe-member-access": "off",
            "@typescript-eslint/no-unsafe-call": "off",
            "@typescript-eslint/no-unsafe-return": "off",
            "@typescript-eslint/no-unsafe-argument": "off",
            "@typescript-eslint/no-non-null-assertion": "off",
        },
    },
);
