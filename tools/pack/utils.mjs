#!/usr/bin/env node
//
//   node tools/pack/utils.mjs pack             packs every shared util
//   node tools/pack/utils.mjs pack Text        packs only Text
//   node tools/pack/utils.mjs unpack           rebuilds the files
//

import { Packer } from "@onetype/stack-api-kit/packing";

new Packer({ at: "src/utils", demo: ["Order", "Text"], name: "util", tool: "utils" }).ran(process.argv.slice(2));
