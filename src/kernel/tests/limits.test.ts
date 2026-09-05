import { describe, expect, test } from "vitest";

import { api } from "../../main";

function request(headers: Record<string, string> = {})
{
    return { req: { header: (name: string) => headers[name.toLowerCase()] } };
}

describe("what a rate limit counts an unknown caller by", () =>
{
    test("is the forwarded address when a proxy is known to set it", () =>
    {
        expect(api.from(true)(request({ "x-forwarded-for": "203.0.113.7" }))).toBe("203.0.113.7");
    });

    test("and the first of the chain, which is the client the proxy saw", () =>
    {
        expect(api.from(true)(request({ "x-forwarded-for": "203.0.113.7, 10.0.0.1, 10.0.0.2" })))
            .toBe("203.0.113.7");
    });

    test("but never the header itself when nothing in front sets it", () =>
    {
        expect(api.from(false)(request({ "x-forwarded-for": "203.0.113.7" }))).toBe("anonymous");
    });

    test("and an empty or absent one counts as the shared stranger", () =>
    {
        expect(api.from(true)(request({ "x-forwarded-for": "" }))).toBe("anonymous");
        expect(api.from(true)(request({ "x-forwarded-for": "   " }))).toBe("anonymous");
        expect(api.from(true)(request())).toBe("anonymous");
    });
});

describe("what a watch says about listeners that failed", () =>
{
    const failure = (at: number, plugin = "billing", event = "invoices.issued") =>
        ({ event, plugin, error: new Error("nope"), at });

    test("is everything it has not read before", () =>
    {
        const { fresh, read } = api.unseen([failure(10), failure(20)], 0);

        expect(fresh).toHaveLength(2);
        expect(read).toBe(2);
    });

    test("and never the same one twice", () =>
    {
        const failures = [failure(10), failure(20)];

        expect(api.unseen(failures, api.unseen(failures, 0).read).fresh).toEqual([]);
    });

    /* A burst of failures shares a millisecond, so comparing them loses some. */
    test("including one that failed in the same millisecond as the last", () =>
    {
        const { read } = api.unseen([failure(10)], 0);
        const { fresh } = api.unseen([failure(10), failure(10)], read);

        expect(fresh).toHaveLength(1);
    });

    test("but does notice one that fails again after that", () =>
    {
        const { read } = api.unseen([failure(10)], 0);
        const { fresh } = api.unseen([failure(10), failure(30)], read);

        expect(fresh).toHaveLength(1);
        expect(fresh[0]?.at).toBe(30);
    });

    test("and says nothing at all when nothing broke", () =>
    {
        expect(api.unseen([], 0)).toEqual({ fresh: [], read: 0 });
    });
});
