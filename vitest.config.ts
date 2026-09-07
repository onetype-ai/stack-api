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

        // Project.checks() reads the tree from disk, so nothing it looks at is
        // an import a watcher would follow. Without this, a boundary broken
        // while dev runs stays green until verify.
        forceRerunTriggers: ["**/src/**/*.ts"],
    },
});
