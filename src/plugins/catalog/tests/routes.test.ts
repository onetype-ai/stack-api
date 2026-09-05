import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { calling } from "@onetype/stack-api-kit/testing";

import { caller, serving, type Serving } from "./serving";

let api: Serving;

beforeEach(async () =>
{
    api = await serving();
});

afterEach(async () =>
{
    await api.stop();
});

async function added(name = "A product"): Promise<{ id: string }>
{
    const answer = await api.kernel.handle({
        method: "POST",
        path: "/catalog/products",
        input: { name, cents: 2500 },
        caller: caller(),
    });

    return answer.body as { id: string };
}

describe("authentication", () =>
{
    test("refuses a caller with no id", async () =>
    {
        const answer = await api.kernel.handle({
            method: "GET",
            path: "/catalog/products",
            input: {},
            caller: { id: undefined, permissions: [], claims: {} },
        });

        expect(answer.status).toBe(401);
    });
});

describe("permissions", () =>
{
    test("refuses a reader who tries to write, naming no permission", async () =>
    {
        const reader = calling(["catalog.read"], "u2", { shopId: "acme" });

        const answer = await api.kernel.handle({
            method: "POST",
            path: "/catalog/products",
            input: { name: "Theirs", cents: 100 },
            caller: reader,
        });

        expect(answer.status).toBe(403);
        expect(JSON.stringify(answer.body)).not.toContain("catalog.write");
    });
});

describe("input", () =>
{
    test("refuses a body that fails the schema before a handler sees it", async () =>
    {
        const answer = await api.kernel.handle({
            method: "POST",
            path: "/catalog/products",
            input: { name: "A product", cents: -1 },
            caller: caller(),
        });

        expect(answer.status).toBe(400);
    });

    test("refuses a name of nothing but spaces", async () =>
    {
        const answer = await api.kernel.handle({
            method: "POST",
            path: "/catalog/products",
            input: { name: "   ", cents: 100 },
            caller: caller(),
        });

        expect(answer.status).toBe(400);
    });
});

describe("answers", () =>
{
    test("says 201 and where the product went", async () =>
    {
        const answer = await api.kernel.handle({
            method: "POST",
            path: "/catalog/products",
            input: { name: "A product", cents: 100 },
            caller: caller(),
        });

        expect(answer.status).toBe(201);
        expect(answer.headers?.location).toMatch(/^\/catalog\/products\//);
    });

    test("sends back only what the schema names", async () =>
    {
        const made = await added();

        const answer = await api.kernel.handle({
            method: "GET",
            path: "/catalog/products/:id",
            input: { id: made.id },
            caller: caller(),
        });

        expect(Object.keys(answer.body as object).sort())
            .toEqual(["cents", "createdAt", "id", "name", "status"]);
    });
});

describe("pages", () =>
{
    test("walks a cursor without repeating or skipping", async () =>
    {
        api = await serving({ pageSize: 2 });

        for (const name of ["Delta", "Alpha", "Echo", "Bravo", "Charlie"])
        {
            await added(name);
        }

        const seen: string[] = [];
        let after: string | undefined;

        for (let page = 0; page < 5; page += 1)
        {
            const answer = await api.kernel.handle({
                method: "GET",
                path: "/catalog/products",
                input: after === undefined ? {} : { after },
                caller: caller(),
            });

            const body = answer.body as { products: { name: string }[]; after?: string };

            seen.push(...body.products.map((product) => product.name));
            after = body.after;

            if (after === undefined)
            {
                break;
            }
        }

        expect(seen).toEqual(["Alpha", "Bravo", "Charlie", "Delta", "Echo"]);
    });
});
