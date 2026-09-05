import type { Context } from "@onetype/stack-api-kit";

import type { Order } from "./schemas/Order";
import type { OrderPage } from "./schemas/OrderPage";
import type { Services } from "./types/Services";

export const Orders = {
    services: (ctx: Context): Services =>
    {
        return ctx.use<Services>("orders");
    },

    list: (ctx: Context): Promise<OrderPage> =>
    {
        return Orders.services(ctx).orders.list();
    },

    reserve: (ctx: Context, productId: string): Promise<Order> =>
    {
        return Orders.services(ctx).orders.reserve(productId);
    },
};

export type { Order as ShopOrder } from "./schemas/Order";
export type { OrderPage as ShopOrderPage } from "./schemas/OrderPage";
