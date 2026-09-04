import type { Context } from "@onetype/stack-api-kit";

import type { Product } from "./schemas/Product";
import type { ProductPage } from "./schemas/ProductPage";
import type { Services } from "./types/Services";
import type { Status } from "./schemas/Status";

export const Catalog = {
    services: (ctx: Context): Services =>
    {
        return ctx.use<Services>("catalog");
    },

    get: (ctx: Context, id: string): Promise<Product> =>
    {
        return Catalog.services(ctx).products.get(id);
    },

    list: (ctx: Context, locale: string): Promise<ProductPage> =>
    {
        return Catalog.services(ctx).products.list({ locale });
    },

    setStatus: (ctx: Context, id: string, status: Status): Promise<Product> =>
    {
        return Catalog.services(ctx).products.setStatus(id, status);
    },
};

export type { Product as CatalogProduct } from "./schemas/Product";
export type { ProductPage as CatalogProductPage } from "./schemas/ProductPage";
export type { Status as CatalogStatus } from "./schemas/Status";
