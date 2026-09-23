import { join } from "node:path";

import { expect, test } from "vitest";

import { StoredContracts } from "@onetype/stack-api-kit/testing";

import { Plugins } from "../plugins";

const LOCK = join(import.meta.dirname, "..", "..", "..", "stored-contracts.lock.json");

test("no stored schema changed in a way an older row would fail against, unless the lock accepted it (pnpm stored:accept)", async () =>
{
    const breaches = StoredContracts.checkFile(LOCK, await Plugins.discover());

    expect(breaches.map((breach) => `[stored-contract] ${breach.name} ${breach.path}: ${breach.change}`)).toEqual([]);
}, 60_000);
