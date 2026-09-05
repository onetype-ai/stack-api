import { Answered, defineRoute } from "@onetype/stack-api-kit";
import { z } from "zod";

import { Order } from "../schemas/Order";
import { OrderPage } from "../schemas/OrderPage";

import type { Endpoint } from "@onetype/stack-api-kit";
import type { Inside } from "../types/Context";

const route = defineRoute<Inside>();

export const orderRoutes: readonly Endpoint<Inside>[] = [
    route({
        method: "GET",
        path: "/orders",
        describe: "Lists this shop's orders, and how many are still held.",
        requires: ["orders.read"],
        input: z.object({}),
        output: OrderPage.schema,
        limit: { requests: 120, seconds: 60 },
        handle: (_input, ctx) =>
        {
            return ctx.services.orders.list();
        },
    }),
    route({
        method: "POST",
        path: "/orders",
        describe: "Holds a product for a while.",
        requires: ["orders.write"],
        input: z.object({ productId: z.uuid() }),
        output: Order.schema,
        limit: { requests: 30, seconds: 60 },
        handle: async (input, ctx) =>
        {
            const order = await ctx.services.orders.reserve(input.productId);

            return new Answered(201, order, { location: `/orders/${order.id}` });
        },
    }),
    route({
        method: "POST",
        path: "/orders/:id/pay",
        describe: "Takes payment for a held order.",
        requires: ["orders.write"],
        input: z.object({ id: z.uuid() }),
        output: Order.schema,
        limit: { requests: 30, seconds: 60 },
        handle: (input, ctx) =>
        {
            return ctx.services.orders.pay(input.id);
        },
    }),
    route({
        method: "DELETE",
        path: "/orders/:id",
        describe: "Lets go of a held order.",
        requires: ["orders.write"],
        input: z.object({ id: z.uuid() }),
        output: z.object({ cancelled: z.literal(true) }),
        limit: { requests: 30, seconds: 60 },
        handle: async (input, ctx) =>
        {
            await ctx.services.orders.cancel(input.id);

            return { cancelled: true as const };
        },
    }),
];
