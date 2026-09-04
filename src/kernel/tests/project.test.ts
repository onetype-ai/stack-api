import { expect, test } from "vitest";

import { Project } from "@onetype/stack-api-kit/testing";

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
