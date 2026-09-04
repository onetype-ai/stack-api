import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const at = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
    resolve: {
        alias: [
            { find: /^@onetype\/stack-api-kit$/, replacement: at("./packages/stack-api-kit/src/index.ts") },
            { find: /^@onetype\/stack-api-kit\/testing$/, replacement: at("./packages/stack-api-kit/src/testing.ts") },
            { find: /^@plugins\//, replacement: `${at("./src/plugins")}/` },
            { find: /^@utils\//, replacement: `${at("./src/utils")}/` },
        ],
    },
    test: {
        environment: "node",
        globals: true,
        include: ["src/**/tests/**/*.test.ts"],
        passWithNoTests: false,
    },
});
