import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

import { Project } from "@onetype/stack-api-kit/testing";

const LONGER = new Set(["#docs/reference.md"]);

/* Skipped while the documents are packed into docs.md. */
const unpacked = existsSync(join(process.cwd(), "#docs"));

describe.skipIf(!unpacked)("the documents this project ships", () =>
{
    test("hold to what they say about themselves", () =>
    {
        const problems = Project.checks().filter((problem) =>
            !(problem.check === "oversized" && [...LONGER].some((named) => problem.message.startsWith(named))));

        expect(problems).toEqual([]);
    });

    test("and the reference stays a reference, not a book", () =>
    {
        const over = Project.checks({ limit: 3400 })
            .filter((problem) => problem.check === "oversized");

        expect(over).toEqual([]);
    });
});

test("the documents are either a folder or the file they pack into", () =>
{
    expect(unpacked || existsSync(join(process.cwd(), "docs.md"))).toBe(true);
});
