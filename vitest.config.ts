import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const at = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
    resolve: {
        alias: [
            { find: /^@plugins\//, replacement: `${at("./src/plugins")}/` },
            { find: /^@utils\//, replacement: `${at("./src/utils")}/` },
        ],
    },
    test: {
        environment: "node",
        globals: true,
        include: ["src/**/tests/**/*.test.ts"],
        passWithNoTests: false,

        // Every test runs on both databases a deployment may choose. On Postgres,
        // one PGlite a worker holds a schema a kernel, so the worker keeps its modules.
        projects: [
            {
                extends: true,
                test: { name: "sqlite", setupFiles: ["src/kernel/tests/kernels.ts"] },
            },
            {
                extends: true,
                test: {
                    name: "postgres",
                    env: { KIT_DIALECT: "postgres" },
                    isolate: false,
                    setupFiles: ["@onetype/stack-api-kit/testing/postgres", "src/kernel/tests/kernels.ts"],
                },
            },
        ],

        // Project.checks() reads the tree from disk, so nothing it looks at is
        // an import a watcher would follow. Without this, a boundary broken
        // while dev runs stays green until verify.
        forceRerunTriggers: ["**/src/**/*.ts"],
    },
});
