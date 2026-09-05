#!/usr/bin/env node
//
//   node tools/pack/docs.mjs pack              #docs/ -> docs.md
//   node tools/pack/docs.mjs unpack            docs.md -> #docs/
//

import { Packer } from "./index.mjs";

new Packer({ at: "#docs", into: "docs.md", name: "document", tool: "docs" }).ran(process.argv.slice(2));
