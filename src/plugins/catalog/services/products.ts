import { and, eq, max } from "drizzle-orm";

import type { SQL } from "drizzle-orm";
import { Refusal } from "@onetype/stack-api-kit";

import { Ordering } from "@utils/Ordering";
import { Product } from "../schemas/Product";
import { Text } from "@utils/Text";
import { products } from "../tables/products";

import type { Inside } from "../types/Context";
import type { Listing } from "../types/Listing";
import type { ProductPage } from "../schemas/ProductPage";
import type { Status } from "../schemas/Status";

type Row = typeof products.$inferSelect;

export class ProductsService
{
    readonly #ctx: Inside;

    constructor(ctx: Inside)
    {
        this.#ctx = ctx;
    }

    /**
     * One page, in the caller's language.
     *
     * Ordered here rather than in SQL, because SQL orders by code point and
     * would put every accented name after Z. The cost is that the shop's
     * products are collated in the process; the page size bounds what leaves.
     */
    async list(asked: Listing): Promise<ProductPage>
    {
        const found = await this.#ctx.db
            .select()
            .from(products)
            .where(this.#scoped(asked.status));

        const collator = Ordering.by(asked.locale);
        const sorted = [...found].sort((one, two) => collator.compare(one.name, two.name));

        const from = asked.after === undefined
            ? 0
            : sorted.findIndex((row) => row.id === asked.after) + 1;

        const size = this.#ctx.config.pageSize;
        const page = sorted.slice(from, from + size);
        const last = page.at(-1);

        return {
            products: page.map((row) => this.#shown(row)),
            ...(from + size < sorted.length && last !== undefined && { after: last.id }),
        };
    }

    async get(id: string): Promise<Product>
    {
        const [row] = await this.#ctx.db.select().from(products).where(this.#just(id));

        if (row === undefined)
        {
            throw this.#missing();
        }

        return this.#shown(row);
    }

    /** Every product whose folded name holds this, so Uber finds Über. */
    async matching(text: string): Promise<Product[]> 
    {
        const looking = Text.searched(text);
        const found = await this.#ctx.db.select().from(products).where(this.#scoped());

        return found
            .filter((row) => row.searched.includes(looking))
            .map((row) => this.#shown(row));
    }

    async add(name: string, cents: number): Promise<Product> 
    {
        const clean = Product.parseName(name);
        const searched = Text.searched(clean);
        const same = Text.same(clean);

        const refusal = await this.#ctx.hooks.run("catalog.product.before-list", {
            id: crypto.randomUUID(),
            name: clean,
            cents,
        });

        if (refusal !== undefined)
        {
            throw new Refusal(409, "PRODUCT_REFUSED", refusal);
        }

        return this.#ctx.tx(async (inside) =>
        {
            const [highest] = await inside.db
                .select({ at: max(products.sequence) })
                .from(products)
                .where(this.#scoped());

            const row = {
                id: crypto.randomUUID(),
                name: clean,
                searched,
                same,
                cents,
                status: "draft",
                createdAt: new Date(this.#ctx.now()).toISOString(),
                sequence: (highest?.at ?? 0) + 1,

                // Written from the caller, never from the input: without this
                // a caller could store a row into another shop.
                ...this.#ctx.stamped("products"),
            } as Row;

            await inside.db.insert(products).values(row).onConflictDoNothing();

            const [written] = await inside.db.select().from(products).where(this.#just(row.id));

            if (written === undefined)
            {
                throw new Refusal(409, "NAME_TAKEN", "This shop already sells something by that name.");
            }

            inside.events.emit("catalog.product.added", { id: row.id, shopId: row.shopId, cents });

            return this.#shown(written);
        });
    }

    async setStatus(id: string, status: Status): Promise<Product>
    {
        const where = this.#just(id);

        return this.#ctx.tx(async (inside) =>
        {
            const [row] = await inside.db.update(products).set({ status }).where(where).returning();

            if (row === undefined)
            {
                throw this.#missing();
            }

            inside.events.emit("catalog.product.status-changed", { id, shopId: row.shopId, status });

            return this.#shown(row);
        });
    }

    async remove(id: string): Promise<void>
    {
        const where = this.#just(id);

        await this.#ctx.tx(async (inside) =>
        {
            const gone = await inside.db
                .delete(products)
                .where(where)
                .returning({ id: products.id, shopId: products.shopId });

            const removed = gone[0];

            if (removed === undefined)
            {
                throw this.#missing();
            }

            inside.events.emit("catalog.product.removed", { id, shopId: removed.shopId });
        });
    }

    async countMine(): Promise<number>
    {
        const found = await this.#ctx.db.select({ id: products.id }).from(products).where(this.#scoped());

        return found.length;
    }

    /** Narrowed to the caller's shop. `ctx.scoped` refuses when they have none. */
    #scoped(status?: Status): SQL | undefined
    {
        const shop = this.#ctx.scoped<SQL>("products");

        return status === undefined ? shop : and(shop, eq(products.status, status));
    }

    #just(id: string): SQL | undefined
    {
        return and(eq(products.id, id), this.#scoped());
    }

    #missing(): Refusal
    {
        return new Refusal(404, "NOT_FOUND", "No such product.");
    }

    /** Only what the schema names leaves. The shop and the fold never do. */
    #shown(row: Row): Product
    {
        return {
            id: row.id,
            name: row.name,
            cents: row.cents,
            status: Product.schema.shape.status.parse(row.status),
            createdAt: row.createdAt,
        };
    }
}
