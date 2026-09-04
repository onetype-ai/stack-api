import { expect, test } from "vitest";

import { Project } from "@onetype/stack-api-kit/testing";

/**
 * A procedure is read, so it is bounded at 1800: one that does not fit a
 * screen is one nobody finishes. A reference is searched rather than read,
 * and split across files it answers the wrong one half the time, so it is
 * allowed to be longer. That is the only exception, and it is named here.
 */
const LONGER = new Set(["#docs/reference.md"]);

test("this project holds to what it says about itself", () =>
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
