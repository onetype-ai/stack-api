#!/usr/bin/env node
//
//   node tools/pack/plugins.mjs pack           packs the demo pair
//   node tools/pack/plugins.mjs pack a b       packs only a and b
//   node tools/pack/plugins.mjs unpack         rebuilds the folders
//

import { Packer } from "@onetype/stack-api-kit/packing";

new Packer({ at: "src/plugins", demo: ["notes", "labels", "readers"], name: "plugin", tool: "plugins" }).ran(process.argv.slice(2));
