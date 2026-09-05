import { z } from "zod";

import { Status } from "./Status";

export const Order = {
    schema: z.object({
        id: z.uuid(),
        productId: z.uuid(),
        cents: z.number().int().nonnegative(),
        status: Status.schema,
        createdAt: z.iso.datetime(),
    }),
};

export type Order = z.infer<typeof Order.schema>;
