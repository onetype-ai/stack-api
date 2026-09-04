import { z } from "zod";

import { Product } from "./Product";

export const ProductPage = {
    schema: z.object({
        products: z.array(Product.schema),

        /**
         * Where the next page starts, or absent at the end.
         *
         * A cursor rather than a page number: order is decided in the
         * service, so an offset shifts the moment a product is written ahead
         * of the one a reader stopped at.
         */
        after: z.string().optional(),
    }),
};

export type ProductPage = z.infer<typeof ProductPage.schema>;
