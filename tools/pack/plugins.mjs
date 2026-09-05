#!/usr/bin/env node
//
//   node tools/pack/plugins.mjs pack           packs the demo pair
//   node tools/pack/plugins.mjs pack a b       packs only a and b
//   node tools/pack/plugins.mjs unpack         rebuilds the folders
//

import { Packer } from "./index.mjs";

new Packer({ at: "src/plugins", demo: ["catalog", "orders"], name: "plugin" }).ran(process.argv.slice(2));
