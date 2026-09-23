// Rewrites stored-contracts.lock.json from today's stored schemas: event payloads, command inputs and
// every Stored.define. A change an older row would fail against is refused unless named here with why:
//   pnpm stored:accept --breaking items.details="0007-backfill-details.sql carries old rows over"
import { join } from "node:path";

import { StoredContracts } from "@onetype/stack-api-kit/testing";

import { Plugins } from "../src/kernel/plugins.ts";

const lock = join(import.meta.dirname, "..", "stored-contracts.lock.json");
const breaking = Object.fromEntries(process.argv.slice(2)
    .filter((argument, index, all) => all[index - 1] === "--breaking")
    .map((pair) => [pair.slice(0, pair.indexOf("=")), pair.slice(pair.indexOf("=") + 1)]));

const breaches = StoredContracts.accept(lock, await Plugins.discover(), breaking);

for (const breach of breaches)
{
    process.stderr.write(`[stored-contract] ${breach.name} ${breach.path}: ${breach.change}\n`);
}

process.exit(breaches.length === 0 ? 0 : 1);
