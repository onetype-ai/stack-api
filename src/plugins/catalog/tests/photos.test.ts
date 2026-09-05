import { afterEach, describe, expect, test } from "vitest";

import { eq } from "drizzle-orm";

import { photos } from "../tables/photos";

import { caller, serving, type Serving } from "./serving";

let api: Serving;

afterEach(async () =>
{
    await api.stop();
});

function held(): { photos: { add: (id: string, url: string) => Promise<unknown>; of: (id: string) => Promise<unknown[]> } }
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

        await expect(held().photos.add(id, "javascript:alert(1)")).rejects.toThrow();
        await expect(held().photos.add(id, "not a url")).rejects.toThrow();
    });

    test("and a product carries only so many", async () =>
    {
        api = await serving();

        const id = await made();

        for (let at = 0; at < 50; at += 1)
        {
            await held().photos.add(id, `https://pictures.example.test/${String(at)}.jpg`);
        }

        await expect(held().photos.add(id, "https://pictures.example.test/51.jpg")).rejects.toThrow();
    });

    test("and goes when the product it belongs to goes", async () =>
    {
        api = await serving();

        const id = await made();

        await held().photos.add(id, "https://pictures.example.test/one.jpg");
        await api.kernel.handle({ method: "DELETE", path: "/catalog/products/:id", input: { id }, caller: caller() });

        // Asked for by the dead id: a row left behind is still reachable, and
        // is inherited by whatever takes that id next.
        const left = await api.kernel.context("catalog", caller()).db
            .select()
            .from(photos)
            .where(eq(photos.productId, id));

        expect(left).toEqual([]);
    });
});
