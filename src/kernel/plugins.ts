import { readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import type { Plugin } from "@onetype/stack-api-kit";

export const Plugins = {
    at: join(dirname(fileURLToPath(import.meta.url)), "..", "plugins"),

    discover: async (): Promise<Plugin[]> =>
    {
        const folders = await readdir(Plugins.at, { withFileTypes: true });
        const found: Plugin[] = [];

        for (const folder of folders)
        {
            if (folder.isDirectory())
            {
                found.push(await Plugins.read(folder.name));
            }
        }

        return found.sort((first, second) => first.name.localeCompare(second.name));
    },

    read: async (name: string): Promise<Plugin> =>
    {
        const at = join(Plugins.at, name, "plugin.ts");
        const module = (await import(pathToFileURL(at).href)) as { default?: Plugin };

        if (module.default === undefined)
        {
            throw new Error(`src/plugins/${name}/plugin.ts must default-export a definePlugin(...) result.`);
        }

        return module.default;
    },
};
