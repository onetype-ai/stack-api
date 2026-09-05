#!/usr/bin/env node
//
//   node tools/pack/utils.mjs pack             packs every shared util
//   node tools/pack/utils.mjs pack Text        packs only Text
//   node tools/pack/utils.mjs unpack           rebuilds the files
//

import { Packer } from "./index.mjs";

new Packer({ at: "src/utils", demo: ["Ordering", "Text"], name: "util" }).ran(process.argv.slice(2));
