import { describe, expect, test } from "vitest";

import { Api } from "../../main";

function asking(headers: Record<string, string> = {})
{
    return { req: { header: (name: string) => headers[name.toLowerCase()] } };
}

describe("what a rate limit counts an unknown caller by", () =>
{
    test("is the forwarded address when a proxy is known to set it", () =>
    {
        expect(Api.from(true)(asking({ "x-forwarded-for": "203.0.113.7" }))).toBe("203.0.113.7");
    });

    test("and the first of the chain, which is the client the proxy saw", () =>
    {
        expect(Api.from(true)(asking({ "x-forwarded-for": "203.0.113.7, 10.0.0.1, 10.0.0.2" })))
            .toBe("203.0.113.7");
    });

    test("but never the header itself when nothing in front sets it", () =>
    {
        expect(Api.from(false)(asking({ "x-forwarded-for": "203.0.113.7" }))).toBe("anonymous");
    });

    test("and an empty or absent one counts as the shared stranger", () =>
    {
        expect(Api.from(true)(asking({ "x-forwarded-for": "" }))).toBe("anonymous");
        expect(Api.from(true)(asking({ "x-forwarded-for": "   " }))).toBe("anonymous");
        expect(Api.from(true)(asking())).toBe("anonymous");
    });
});

describe("what a watch says about listeners that failed", () =>
{
    const broke = (at: number, plugin = "billing", event = "invoices.issued") =>
        ({ event, plugin, error: new Error("nope"), at });

    test("is everything it has not read before", () =>
    {
        const { fresh, seen } = Api.unseen([broke(10), broke(20)], 0);

        expect(fresh).toHaveLength(2);
        expect(seen).toBe(20);
    });

    test("and never the same one twice", () =>
    {
        const held = [broke(10), broke(20)];

        expect(Api.unseen(held, Api.unseen(held, 0).seen).fresh).toEqual([]);
    });

    test("but does notice one that fails again after that", () =>
    {
        const { seen } = Api.unseen([broke(10)], 0);
        const { fresh } = Api.unseen([broke(10), broke(30)], seen);

        expect(fresh).toHaveLength(1);
        expect(fresh[0]?.at).toBe(30);
    });

    test("and says nothing at all when nothing broke", () =>
    {
        expect(Api.unseen([], 0)).toEqual({ fresh: [], seen: 0 });
    });
});
