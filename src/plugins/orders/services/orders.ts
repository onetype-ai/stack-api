import { and, count, eq, gt, lte, max } from "drizzle-orm";
import { Catalog } from "@plugins/catalog";
import { Refusal } from "@onetype/stack-api-kit";

import { Charge } from "../schemas/Charge";
import type { Reserving } from "./Reserving";
import { orders } from "../tables/orders";

import type { Inside } from "../types/Context";
import type { Order } from "../schemas/Order";
import type { OrderPage } from "../schemas/OrderPage";
import type { SQL } from "drizzle-orm";
import type { Status } from "../schemas/Status";

type Row = typeof orders.$inferSelect;

export class OrdersService
{
    readonly #ctx: Inside;

    constructor(ctx: Inside)
    {
        this.#ctx = ctx;
    }

    async list(): Promise<OrderPage>
    {
        const found = await this.#ctx.db.select().from(orders).where(this.#scoped());
        const now = this.#ctx.now();

        // A hold past its moment is one a read ignores, whether or not the
        // sweep has been by yet.
        const [held] = await this.#ctx.db
            .select({ total: count() })
            .from(orders)
            .where(and(this.#scoped("reserved"), gt(orders.holdsUntil, this.#ctx.now())));

        return {
            orders: found.map((row) => this.#shown(
                row.status === "reserved" && row.holdsUntil <= now ? { ...row, status: "expired" } : row,
            )),
            reserved: held?.total ?? 0,
        };
    }

    async get(id: string): Promise<Order>
    {
        const [row] = await this.#ctx.db.select().from(orders).where(this.#just(id));

        if (row === undefined)
        {
            throw this.#missing();
        }

        return this.#shown(row);
    }

    async reserve(productId: string): Promise<Order>
    {
        const product = await Catalog.get(this.#ctx, productId);

        if (product.status !== "listed")
        {
            throw new Refusal(409, "NOT_FOR_SALE", "That product is not for sale.");
        }

        const holdsUntil = this.#ctx.now() + this.#ctx.config.holdSeconds * 1000;

        return this.#ctx.tx(async (inside) =>
        {
            // Asked again inside the transaction. The answer above is from
            // before it opened, and a product withdrawn in that gap would
            // otherwise be reserved anyway, and then paid for.
            const still = await Catalog.get(inside, productId);

            if (still.status !== "listed")
            {
                throw new Refusal(409, "NOT_FOR_SALE", "That product is not for sale.");
            }

            const [highest] = await inside.db
                .select({ at: max(orders.sequence) })
                .from(orders)
                .where(this.#scoped());

            const row = {
                id: crypto.randomUUID(),
                productId: product.id,
                cents: product.cents,
                status: "reserved",
                holdsUntil,
                createdAt: new Date(this.#ctx.now()).toISOString(),
                sequence: (highest?.at ?? 0) + 1,
                ...this.#ctx.stamped("orders"),
            } as Row;

            await inside.db.insert(orders).values(row);

            // Asked for inside the transaction, so a reservation that rolls
            // back is never released by a command about nothing.
            inside.commands.later("orders.release-holds", { shopId: row.shopId }, this.#ctx.config.holdSeconds);

            this.#ctx.owned<Reserving>()?.took();

            inside.events.emit("orders.order.reserved", { id: row.id, shopId: row.shopId, productId: product.id });

            return this.#shown(row);
        });
    }

    async pay(id: string): Promise<Order>
    {
        const order = await this.get(id);

        // Won in one statement, before the money moves: a second payer finds the
        // row no longer reserved and is refused, rather than charging it again.
        const [won] = await this.#ctx.write(() =>
            this.#ctx.db
                .update(orders)
                .set({ status: "paid" })
                .where(and(
                    this.#just(id),
                    eq(orders.status, "reserved"),
                    gt(orders.holdsUntil, this.#ctx.now()),
                ))
                .returning());

        if (won === undefined)
        {
            throw order.status === "reserved"
                ? new Refusal(409, "HOLD_EXPIRED", "That reservation has expired.")
                : new Refusal(409, "NOT_RESERVED", "That order is not waiting to be paid.");
        }

        try
        {
            await this.#charged(won.cents, won.id);
        }
        catch (cause)
        {
            // Only the row this call marked paid, and back to what the clock
            // says it is: expired if the moment passed while the bank thought
            // about it, or nothing would ever move it again.
            await this.#ctx.write(() =>
                this.#ctx.db
                    .update(orders)
                    .set({ status: won.holdsUntil > this.#ctx.now() ? "reserved" : "expired" })
                    .where(and(this.#just(id), eq(orders.status, "paid"))));

            throw cause;
        }

        return this.#ctx.tx(async (inside) =>
        {
            const [row] = await inside.db.select().from(orders).where(this.#just(id));

            if (row === undefined)
            {
                throw this.#missing();
            }

            inside.events.emit("orders.order.paid", { id, shopId: row.shopId, cents: row.cents });

            return this.#shown(row);
        });
    }

    async cancel(id: string): Promise<void>
    {
        await this.#ctx.tx(async (inside) =>
        {
            const [row] = await inside.db
                .update(orders)
                .set({ status: "cancelled" })
                .where(and(this.#just(id), eq(orders.status, "reserved")))
                .returning();

            if (row === undefined)
            {
                throw this.#missing();
            }

            inside.events.emit("orders.order.cancelled", { id, shopId: row.shopId });
        });
    }

    async releaseHolds(): Promise<number>
    {
        return this.#ctx.tx(async (inside) =>
        {
            const gone = await inside.db
                .update(orders)
                .set({ status: "expired" })
                .where(and(
                    this.#scoped("reserved"),
                    lte(orders.holdsUntil, this.#ctx.now()),
                ))
                .returning({ id: orders.id, shopId: orders.shopId });

            for (const row of gone)
            {
                inside.events.emit("orders.order.expired", { id: row.id, shopId: row.shopId });
            }

            return gone.length;
        });
    }

    async dropFor(productId: string): Promise<number>
    {
        const gone = await this.#ctx.write(() =>
            this.#ctx.db
                .update(orders)
                .set({ status: "cancelled" })
                .where(and(
                    this.#scoped("reserved"),
                    eq(orders.productId, productId),
                ))
                .returning({ id: orders.id }));

        return gone.length;
    }

    async #charged(cents: number, reference: string): Promise<void>
    {
        const url = this.#ctx.config.payments;

        if (url === undefined)
        {
            return;
        }

        const answer = await this.#ctx.fetch({
            method: "POST",
            url: `${url}/v1/charges`,

            // The reference is ours and never changes between attempts, so a
            // retry asks about the charge they already hold rather than
            // taking the money twice.
            body: { cents, reference },
        });


        const told = Charge.schema.safeParse(answer);

        if (!told.success)
        {
            throw new Refusal(502, "PAYMENTS_UNREADABLE", "The payments service answered something we cannot read.");
        }

        if (!told.data.paid)
        {
            throw new Refusal(402, "PAYMENT_REFUSED", "That payment was refused.");
        }
    }

    #scoped(status?: Status): SQL | undefined
    {
        const shop = this.#ctx.scoped<SQL>("orders");

        return status === undefined ? shop : and(shop, eq(orders.status, status));
    }

    #just(id: string): SQL | undefined
    {
        return and(eq(orders.id, id), this.#scoped());
    }

    #missing(): Refusal
    {
        return new Refusal(404, "NOT_FOUND", "No such order.");
    }

    #shown(row: Row): Order
    {
        return {
            id: row.id,
            productId: row.productId,
            cents: row.cents,
            status: row.status as Status,
            createdAt: row.createdAt,
        };
    }
}
