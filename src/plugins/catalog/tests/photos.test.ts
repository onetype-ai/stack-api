import { afterEach, describe, expect, test } from "vitest";

import { eq } from "drizzle-orm";

import { photos } from "../tables/photos";

import type { Inside } from "../types/Context";

import { caller, serving, type Serving } from "./serving";

let api: Serving;

afterEach(async () =>
{
    await api.stop();
});

function catalog(): { photos: { add: (id: string, url: string) => Promise<unknown>; of: (id: string) => Promise<unknown[]> } }
{
    return api.kernel.context("catalog", caller()).services as never;
}

async function made(): Promise<string>
{
    const answer = await api.kernel.handle({
        method: "POST",
        path: "/catalog/products",
        input: { name: `P ${crypto.randomUUID()}`, cents: 100 },
        caller: caller(),
    });

    return (answer.body as { id: string }).id;
}

describe("a photo", () =>
{
    test("is refused unless its url is one a browser could fetch", async () =>
    {
        api = await serving();

        const id = await made();

        await expect(catalog().photos.add(id, "javascript:alert(1)")).rejects.toThrow();
        await expect(catalog().photos.add(id, "not a url")).rejects.toThrow();
    });

    test("and a product carries only so many", async () =>
    {
        api = await serving();

        const id = await made();

        for (let at = 0; at < 50; at += 1)
        {
            await catalog().photos.add(id, `https://pictures.example.test/${String(at)}.jpg`);
        }

        await expect(catalog().photos.add(id, "https://pictures.example.test/51.jpg")).rejects.toThrow();
    });

    test("and goes when the product it belongs to goes", async () =>
    {
        api = await serving();

        const id = await made();

        await catalog().photos.add(id, "https://pictures.example.test/one.jpg");
        await api.kernel.handle({ method: "DELETE", path: "/catalog/products/:id", input: { id }, caller: caller() });

        /* The dead id: a row left behind is inherited by whatever takes it next. */
        const inside = api.kernel.context("catalog", caller()) as unknown as Inside;
        const left = await inside.db.select().from(photos).where(eq(photos.productId, id));

        expect(left).toEqual([]);
    });
});
