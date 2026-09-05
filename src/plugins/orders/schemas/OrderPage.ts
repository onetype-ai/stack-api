import { z } from "zod";

import { Order } from "./Order";

export const OrderPage = {
    schema: z.object({
        orders: z.array(Order.schema),
        reserved: z.number().int().nonnegative(),
    }),
};

export type OrderPage = z.infer<typeof OrderPage.schema>;
