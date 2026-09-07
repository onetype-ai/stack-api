#!/usr/bin/env node
//
//   node tools/pack/examples.mjs unpack    every example, as files
//   node tools/pack/examples.mjs pack      folded away again
//
// Both together: the example plugins import the example utils, so unpacking
// one without the other leaves source reaching for a file that is not there.

import { existsSync } from "node:fs";
import { join } from "node:path";

import { Packer } from "./index.mjs";

const parts = [
    { at: "src/plugins", demo: ["notes", "labels", "readers"], name: "plugin", tool: "plugins" },
    { at: "src/utils", demo: ["Order", "Text"], name: "util", tool: "utils" },
];

const asked = process.argv.slice(2);
const doing = asked[0] ?? "";

for (const part of parts)
{
    const folded = part.demo.every((name) => !existsSync(join(process.cwd(), ...part.at.split("/"), name)));

    if (doing === "pack" && folded)
    {
        continue;
    }

    if (doing === "unpack" && !folded)
    {
        continue;
    }

    new Packer(part).ran(asked);
}
