import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import type { Plugin } from "@onetype/stack-api-kit";

export const Plugins = {
    folder: join(dirname(fileURLToPath(import.meta.url)), "..", "plugins"),

    discover: async (): Promise<Plugin[]> =>
    {
        if (!existsSync(Plugins.folder))
        {
            return [];
        }

        const folders = await readdir(Plugins.folder, { withFileTypes: true });
        const plugins: Plugin[] = [];

        for (const folder of folders)
        {
            if (folder.isDirectory())
            {
                plugins.push(await Plugins.read(folder.name));
            }
        }

        return plugins.sort((first, second) => first.name.localeCompare(second.name));
    },

    read: async (name: string): Promise<Plugin> =>
    {
        const file = join(Plugins.folder, name, "plugin.ts");
        const module = (await import(pathToFileURL(file).href)) as { default?: Plugin };

        if (module.default === undefined)
        {
            throw new Error(`src/plugins/${name}/plugin.ts must default-export a definePlugin(...) result.`);
        }

        return module.default;
    },
};
