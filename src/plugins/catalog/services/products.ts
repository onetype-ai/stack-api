import { Refusal } from "@onetype/stack-api-kit";

import { Status } from "../schemas/Status";
import { and, count, eq, max } from "drizzle-orm";

import { Ordering } from "@utils/Ordering";
import { Paging } from "../utils/Paging";
import { Product } from "../schemas/Product";
import { Text } from "@utils/Text";
import { photos } from "../tables/photos";
import { products } from "../tables/products";

import type { CatalogContext } from "../types/Context";
import type { Listing } from "../types/Listing";
import type { ProductPage } from "../schemas/ProductPage";
import type { SQL } from "drizzle-orm";


type Row = typeof products.$inferSelect;

export class ProductsService
{
    readonly #ctx: CatalogContext;

    constructor(ctx: CatalogContext)
    {
        this.#ctx = ctx;
    }

    async list(query: Listing): Promise<ProductPage>
    {
        const rows = await this.#ctx.db
            .select()
            .from(products)
            .where(this.#whereShop(query.status));

        const collator = Ordering.by(query.locale);
        const sorted = [...rows].sort((first, second) => collator.compare(first.name, second.name));

        const { page, after } = Paging.from(sorted, this.#ctx.config.pageSize, query.after);

        return {
            products: page.map((row) => this.#toProduct(row)),
            ...(after !== undefined && { after }),
        };
    }

    async get(id: string): Promise<Product>
    {
        const [row] = await this.#ctx.db.select().from(products).where(this.#whereId(id));

        if (row === undefined)
        {
            throw this.#notFoundError();
        }

        return this.#toProduct(row);
    }

    async matching(text: string): Promise<Product[]> 
    {
        const looking = Text.searched(text);

        /* Everything holds "", so a folded-away search would answer with the shop. */
        if (looking === "")
        {
            return [];
        }

        const rows = await this.#ctx.db.select().from(products).where(this.#whereShop());

        return rows
            .filter((row) => row.searched.includes(looking))
            .map((row) => this.#toProduct(row));
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
            /* Counted inside: the hook counts before it opens, so ten at once all pass. */
            const [counted] = await inside.db
                .select({ many: count() })
                .from(products)
                .where(this.#whereShop());

            if ((counted?.many ?? 0) >= this.#ctx.config.maxPerShop)
            {
                throw new Refusal(
                    409,
                    "TOO_MANY",
                    `This shop already holds ${String(this.#ctx.config.maxPerShop)} products.`,
                );
            }

            const [highest] = await inside.db
                .select({ at: max(products.sequence) })
                .from(products)
                .where(this.#whereShop());

            const row = {
                id: crypto.randomUUID(),
                name: clean,
                searched,
                same,
                cents,
                status: "draft",
                createdAt: new Date(this.#ctx.now()).toISOString(),
                sequence: (highest?.at ?? 0) + 1,

                /* From the caller, never the input: otherwise a row lands in another shop. */
                ...this.#ctx.stamped("products"),
            } as Row;

            await inside.db.insert(products).values(row).onConflictDoNothing();

            const [written] = await inside.db.select().from(products).where(this.#whereId(row.id));

            if (written === undefined)
            {
                throw new Refusal(409, "NAME_TAKEN", "This shop already sells something by that name.");
            }

            inside.events.emit("catalog.product.added", { id: row.id, shopId: row.shopId, cents });

            return this.#toProduct(written);
        });
    }

    /* Nothing returns from withdrawn; a shop lists it again as a new one. */
    static #next: Readonly<Record<Status, readonly Status[]>> = {
        draft: ["listed", "withdrawn"],
        listed: ["withdrawn"],
        withdrawn: [],
    };

    async setStatus(id: string, status: Status): Promise<Product>
    {
        const where = this.#whereId(id);

        return this.#ctx.tx(async (inside) =>
        {
            const [before] = await inside.db.select().from(products).where(where);

            if (before === undefined)
            {
                throw this.#notFoundError();
            }

            const now = Status.schema.parse(before.status);

            if (!ProductsService.#next[now].includes(status))
            {
                throw new Refusal(
                    409,
                    "WRONG_STATUS",
                    `A product that is ${now} cannot become ${status}.`,
                );
            }

            const [row] = await inside.db.update(products).set({ status }).where(where).returning();

            if (row === undefined)
            {
                throw this.#notFoundError();
            }

            inside.events.emit("catalog.product.status-changed", { id, shopId: row.shopId, status });

            return this.#toProduct(row);
        });
    }

    async remove(id: string): Promise<void>
    {
        const where = this.#whereId(id);

        await this.#ctx.tx(async (inside) =>
        {
            const rows = await inside.db
                .delete(products)
                .where(where)
                .returning({ id: products.id, shopId: products.shopId });

            const removed = rows[0];

            if (removed === undefined)
            {
                throw this.#notFoundError();
            }

            /* With the product: left behind, they are inherited by the next id. */
            await inside.db.delete(photos).where(eq(photos.productId, id));

            inside.events.emit("catalog.product.removed", { id, shopId: removed.shopId });
        });
    }

    async countForThisShop(): Promise<number>
    {
        const rows = await this.#ctx.db.select({ id: products.id }).from(products).where(this.#whereShop());

        return rows.length;
    }

    #whereShop(status?: Status): SQL | undefined
    {
        const shop = this.#ctx.scoped<SQL>("products");

        return status === undefined ? shop : and(shop, eq(products.status, status));
    }

    #whereId(id: string): SQL | undefined
    {
        return and(eq(products.id, id), this.#whereShop());
    }

    #notFoundError(): Refusal
    {
        return new Refusal(404, "NOT_FOUND", "No such product.");
    }

    #toProduct(row: Row): Product
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
