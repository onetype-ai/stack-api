import { describe, expect, test } from "vitest";

import { Paging } from "../utils/Paging";

const rows = ["a", "b", "c", "d", "e"].map((id) => ({ id }));

describe("a page of an ordered list", () =>
{
    test("starts at the beginning and says where the next one starts", () =>
    {
        expect(Paging.from(rows, 2)).toEqual({ page: [{ id: "a" }, { id: "b" }], after: "b" });
    });

    test("continues from the cursor, never repeating it", () =>
    {
        expect(Paging.from(rows, 2, "b")).toEqual({ page: [{ id: "c" }, { id: "d" }], after: "d" });
    });

    test("and answers no cursor on the last page", () =>
    {
        expect(Paging.from(rows, 2, "d")).toEqual({ page: [{ id: "e" }] });
        expect(Paging.from(rows, 10)).toEqual({ page: rows });
    });

    test("answers nothing for a cursor no row carries", () =>
    {
        expect(Paging.from(rows, 2, "gone")).toEqual({ page: [{ id: "a" }, { id: "b" }], after: "b" });
    });

    test("and nothing at all for an empty list", () =>
    {
        expect(Paging.from([], 2)).toEqual({ page: [] });
    });
});
