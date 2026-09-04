import { and, eq, max } from "drizzle-orm";
import { Refusal } from "@onetype/stack-api-kit";

import { photos } from "../tables/photos";
import { products } from "../tables/products";

import type { Inside } from "../types/Context";
import type { Photo } from "../schemas/Photo";
import type { SQL } from "drizzle-orm";

type Row = typeof photos.$inferSelect;

export class PhotosService
{
    readonly #ctx: Inside;

    constructor(ctx: Inside)
    {
        this.#ctx = ctx;
    }

    async of(productId: string): Promise<Photo[]>
    {
        await this.#owned(productId);

        const found = await this.#ctx.db
            .select()
            .from(photos)
            .where(and(eq(photos.productId, productId), this.#scoped()))
            .orderBy(photos.position);

        return found.map((row) => this.#shown(row));
    }

    async add(productId: string, url: string): Promise<Photo>
    {
        await this.#owned(productId);

        return this.#ctx.tx(async (inside) =>
        {
            const [highest] = await inside.db
                .select({ at: max(photos.position) })
                .from(photos)
                .where(and(eq(photos.productId, productId), this.#scoped()));

            const row = {
                id: crypto.randomUUID(),
                productId,
                url,
                position: (highest?.at ?? -1) + 1,

                // This table's stamp, not the product's. Each scoped table
                // carries the claim itself.
                ...this.#ctx.stamped("photos"),
            } as Row;

            await inside.db.insert(photos).values(row);

            return this.#shown(row);
        });
    }

    async dropFor(productId: string): Promise<number>
    {
        const gone = await this.#ctx.db
            .delete(photos)
            .where(and(eq(photos.productId, productId), this.#scoped()))
            .returning({ id: photos.id });

        return gone.length;
    }

    async #owned(productId: string): Promise<void>
    {
        const [found] = await this.#ctx.db
            .select({ id: products.id })
            .from(products)
            .where(and(eq(products.id, productId), this.#ctx.scoped<SQL>("products")));

        if (found === undefined)
        {
            throw new Refusal(404, "NOT_FOUND", "No such product.");
        }
    }

    #scoped(): SQL | undefined
    {
        return this.#ctx.scoped<SQL>("photos");
    }

    #shown(row: Row): Photo
    {
        return { id: row.id, url: row.url, position: row.position };
    }
}
