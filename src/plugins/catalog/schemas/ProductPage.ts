import { z } from "zod";

import { Product } from "./Product";

export const ProductPage = {
    schema: z.object({
        products: z.array(Product.schema),

        after: z.string().optional(),
    }),
};

export type ProductPage = z.infer<typeof ProductPage.schema>;
