import { defineCommand, defineListener, defineParticipant, definePlugin } from "@onetype/stack-api-kit";
import { z } from "zod";

import { Config } from "./schemas/Config";
import { OrdersService } from "./services/orders";
import { Reserving } from "./services/Reserving";
import { orderRoutes } from "./routes/orders";
import { orders } from "./tables/orders";

import type { Inside } from "./types/Context";
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
        // Every payload carries the shop, because a listener has no caller
        // to ask and an outbox keeps no request.
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
        "catalog.product.removed": defineListener<Inside>()(
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
        "catalog.product.before-list": defineParticipant<Inside>()(
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
        "orders.release-holds": defineCommand<Inside>()({
            describe: "Lets go of one shop's reservations whose moment has passed.",

            // The shop travels in the payload, and nothing else decides which
            // rows are touched: a scheduled command has no caller to scope by,
            // and without this the sweep would reach every shop at once.
            // It stays ungated for that reason, so the payload is the boundary.
            schema: z.object({ shopId: z.string().min(1) }),
            run: async (given, ctx) =>
            {
                // forScope refuses a caller reaching for a shop that is not
                // theirs, and lets the scheduler through because it has none.
                const mine = ctx.forScope(given.shopId);
                const released = await mine.services.orders.releaseHolds();

                if (released > 0)
                {
                    ctx.log.info("holds released", { released, shopId: given.shopId });
                }
            },
        }),
    },

    setup: (ctx) =>
    {
        // Built once and held: a service is made per request, so counting
        // there would start again on every one.
        ctx.owns(new Reserving());

        ctx.log.info("orders ready", { holdSeconds: ctx.config.holdSeconds });
    },

    teardown: (ctx) =>
    {
        const held = ctx.owned<Reserving>();

        ctx.log.info("orders stopped", { reserved: held?.count() ?? 0 });
    },
});
