import { expect, test } from "vitest";

import { Project } from "@onetype/stack-api-kit/testing";

test("no plugin crosses a boundary it did not declare", () =>
{
    const structural = Project.checks()
        .filter((problem) => problem.check === "boundaries" || problem.check === "wiring" || problem.check === "unexplained");

    expect(structural).toEqual([]);
});
