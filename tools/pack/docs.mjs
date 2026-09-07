#!/usr/bin/env node
//
//   node tools/pack/docs.mjs pack     folds #docs into docs.md
//   node tools/pack/docs.mjs unpack   writes the folder back
//

import { Packer } from "@onetype/stack-api-kit/packing";

/* A procedure is read, so it fits a screen; a reference is searched. */
const mostFor = (path) => (path.endsWith("reference.md") ? 6600 : 1800);

new Packer({ at: "#docs", into: "docs.md", name: "document", tool: "docs", limit: mostFor }).ran(process.argv.slice(2));
