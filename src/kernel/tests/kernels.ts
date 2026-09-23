import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseEnv } from "node:util";

import { configureTestKernels } from "@onetype/stack-api-kit/testing";

import { Plugins } from "../plugins";
import { Settings } from "../settings";

// A test names only the plugin it tests: whatever that one depends on comes from src/plugins, configured by
// boot.env as the runtime reads .env. Discovery runs only when a kernel names a dependency it was not given.
// Every kernel keeps an outbox and holds replies to the header allow-list, as src/main.ts starts the api.
configureTestKernels({
    defaults: { outbox: true, strictReplyHeaders: true },
    resolve: async () =>
    {
        const plugins = await Plugins.discover();
        const environment = parseEnv(readFileSync(join(import.meta.dirname, "boot.env"), "utf8"));

        return { plugins, config: Settings.configFor(plugins, environment) };
    },
});
