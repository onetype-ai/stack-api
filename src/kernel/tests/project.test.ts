import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

import { Project } from "@onetype/stack-api-kit/testing";

const LONGER = new Set(["#docs/reference.md"]);

// The documents pack into docs.md, and a check that reads them has nothing to
// read until they are unpacked. `pnpm unpack:docs` is what makes these run.
const unpacked = existsSync(join(process.cwd(), "#docs"));

describe.skipIf(!unpacked)("the documents this project ships", () =>
{
    test("hold to what they say about themselves", () =>
    {
        const wrong = Project.checks().filter((one) =>
            !(one.check === "oversized" && [...LONGER].some((named) => one.message.startsWith(named))));

        expect(wrong).toEqual([]);
    });

    test("and the reference stays a reference, not a book", () =>
    {
        const over = Project.checks({ limit: 3400 })
            .filter((one) => one.check === "oversized");

        expect(over).toEqual([]);
    });
});

test("the documents are either a folder or the file they pack into", () =>
{
    expect(unpacked || existsSync(join(process.cwd(), "docs.md"))).toBe(true);
});
