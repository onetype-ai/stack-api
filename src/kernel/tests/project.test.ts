import { expect, test } from "vitest";

import { Project } from "@onetype/stack-api-kit/testing";

import type { ProjectProblem } from "@onetype/stack-api-kit/testing";

// schemas.md is generated from the installed kit's types by `pnpm schemas`: its size is the kit's
// surface, not prose anyone wrote, so the 1800-character ceiling does not apply to it alone.
const isGenerated = (problem: ProjectProblem): boolean =>
{
    return problem.check === "oversized" && problem.message.startsWith("schemas.md ");
};

// Plugins allowed to leave the process's single thread (a worker, a child process), each named on purpose.
const LEAVING: readonly string[] = [];

// Reading every source file takes seconds on a busy machine, past vitest's default 5 s.
const READ_MS = 60_000;

test("the project holds to every rule the kit checks, including ones added after this was written (given a minute: it reads the whole tree)", () =>
{
    const problems = Project.findAll({ leaving: LEAVING })
        .filter((problem) => !isGenerated(problem))
        .map((problem) => `[${problem.check}] ${problem.message}`);

    expect(problems).toEqual([]);
}, READ_MS);
