import { defineCommand, defineListener, defineParticipant, definePlugin } from "@onetype/stack-api-kit";
import { z } from "zod";

import { Config } from "./schemas/Config";
import { OrdersService } from "./services/orders";
import { ReservationCounter } from "./services/ReservationCounter";
import { orderRoutes } from "./routes/orders";
import { orders } from "./tables/orders";

import type { OrderContext } from "./types/Context";
import type { Rows } from "./types/Rows";
import type { Services } from "./types/Services";

export default definePlugin.over<Rows, Services>()("orders", {
    version: "1.0.0",

    describe: "Holding a product, paying for it, and letting go when nobody does.",

    dependsOn: ["catalog"],

    config: Config.schema,

    tables: { orders },

    migrations: "./src/plugins/orders/migrations",

    outbound: ["https://payments.example.test"],

    scope: {
        describe: "The shop an order belongs to.",
        claim: "shopId",
        tables: { orders: "shopId" },
    },

    permissions: {
        "orders.read": { describe: "See this shop's orders." },
        "orders.write": { describe: "Hold, pay for and cancel this shop's orders." },
    },

    services: (ctx) =>
    {
        return { orders: new OrdersService(ctx) };
    },

    routes: [...orderRoutes],

    emits: {
        /* A listener has no caller to ask, so the shop travels in the payload. */
        "orders.order.reserved": {
            describe: "A product was held. Emitted after the transaction commits.",
            schema: z.object({ id: z.uuid(), shopId: z.string(), productId: z.uuid() }),
        },
        "orders.order.paid": {
            describe: "An order was paid for.",
            schema: z.object({
                id: z.uuid(),
                shopId: z.string(),
                cents: z.number().int().nonnegative(),
            }),
        },
        "orders.order.cancelled": {
            describe: "A held order was let go by whoever held it.",
            schema: z.object({ id: z.uuid(), shopId: z.string() }),
        },
        "orders.order.expired": {
            describe: "A hold ran out before anyone paid.",
            schema: z.object({ id: z.uuid(), shopId: z.string() }),
        },
    },

    listens: {
        "catalog.product.removed": defineListener<OrderContext>()(
            z.object({ id: z.uuid(), shopId: z.string() }),
            {
            describe: "Lets go of every hold on a product that no longer exists.",
            handle: async (gone, ctx) =>
            {
                const acting = ctx.forScope(gone.shopId);
                const dropped = await acting.services.orders.dropFor(gone.id);

                if (dropped > 0)
                {
                    ctx.log.info("holds dropped with their product", { product: gone.id, dropped });
                }
            },
        },
        ),
    },

    participates: {
        "catalog.product.before-list": defineParticipant<OrderContext>()(
            z.object({ id: z.uuid(), name: z.string(), cents: z.number() }),
            {
                describe: "Refuses a product priced at nothing, which no order could charge for.",
                handle: (asked) =>
                {
                    return asked.cents === 0
                        ? "A product sold for nothing cannot be ordered."
                        : undefined;
                },
            },
        ),
    },

    commands: {
        "orders.release-holds": defineCommand<OrderContext>()({
            describe: "Lets go of one shop's reservations whose moment has passed.",

            /* The payload is the boundary: a scheduled command has no caller to scope by. */
            schema: z.object({ shopId: z.string().min(1) }),
            run: async (given, ctx) =>
            {
                const scoped = ctx.forScope(given.shopId);
                const released = await scoped.services.orders.releaseHolds();

                if (released > 0)
                {
                    ctx.log.info("holds released", { released, shopId: given.shopId });
                }
            },
        }),
    },

    setup: (ctx) =>
    {
        /* Built once: a service is made per request and would count from zero. */
        ctx.owns(new ReservationCounter());

        ctx.log.info("orders ready", { holdSeconds: ctx.config.holdSeconds });
    },

    teardown: (ctx) =>
    {
        const counter = ctx.owned<ReservationCounter>();

        ctx.log.info("orders stopped", { reserved: counter?.count() ?? 0 });
    },
});
