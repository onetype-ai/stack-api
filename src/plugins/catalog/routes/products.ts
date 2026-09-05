import { Answered, defineRoute } from "@onetype/stack-api-kit";
import { z } from "zod";

import { Product } from "../schemas/Product";
import { ProductPage } from "../schemas/ProductPage";
import { Status } from "../schemas/Status";

import type { Endpoint } from "@onetype/stack-api-kit";
import type { Inside } from "../types/Context";

const route = defineRoute<Inside>();

export const productRoutes: readonly Endpoint<Inside>[] = [
    route({
        method: "GET",
        path: "/catalog/products",
        describe: "Lists this shop's products, ordered in the caller's language.",
        requires: ["catalog.read"],
        input: z.object({
            locale: z.string().min(2).max(12).optional(),
            status: Status.schema.optional(),
            after: z.uuid().optional(),
        }),
        output: ProductPage.schema,
        limit: { requests: 120, seconds: 60 },
        handle: (input, ctx) =>
        {
            return ctx.services.products.list({
                locale: input.locale ?? ctx.config.locale,
                ...(input.status !== undefined && { status: input.status }),
                ...(input.after !== undefined && { after: input.after }),
            });
        },
    }),
    route({
        method: "GET",
        path: "/catalog/products/:id",
        describe: "Answers one product, if this shop sells it.",
        requires: ["catalog.read"],
        input: z.object({ id: z.uuid() }),
        output: Product.schema,
        limit: { requests: 120, seconds: 60 },
        handle: async (input, ctx) =>
        {
            const product = await ctx.services.products.get(input.id);

            return new Answered(200, product, { "cache-control": "private, max-age=30" });
        },
    }),
    route({
        method: "GET",
        path: "/catalog/search",
        describe: "Finds products whose name holds this, accents ignored.",
        requires: ["catalog.read"],
        input: z.object({ text: z.string().min(1).max(120) }),
        output: z.object({ products: z.array(Product.schema) }),
        limit: { requests: 60, seconds: 60 },
        handle: async (input, ctx) =>
        {
            return { products: await ctx.services.products.matching(input.text) };
        },
    }),
    route({
        method: "POST",
        path: "/catalog/products",
        describe: "Adds a product to this shop.",
        requires: ["catalog.write"],
        input: z.object({
            name: z.string().min(1).max(4000),
            cents: z.number().int().nonnegative().max(100_000_000),
        }),
        output: Product.schema,
        limit: { requests: 30, seconds: 60 },
        handle: async (input, ctx) =>
        {
            const product = await ctx.services.products.add(input.name, input.cents);

            return new Answered(201, product, { location: `/catalog/products/${product.id}` });
        },
    }),
    route({
        method: "PATCH",
        path: "/catalog/products/:id",
        describe: "Moves a product between draft, listed and withdrawn.",
        requires: ["catalog.write"],
        input: z.object({ id: z.uuid(), status: Status.schema }),
        output: Product.schema,
        limit: { requests: 60, seconds: 60 },
        handle: (input, ctx) =>
        {
            return ctx.services.products.setStatus(input.id, input.status);
        },
    }),
    route({
        method: "DELETE",
        path: "/catalog/products/:id",
        describe: "Removes a product from this shop.",
        requires: ["catalog.write"],
        input: z.object({ id: z.uuid() }),
        output: z.object({ removed: z.literal(true) }),
        limit: { requests: 30, seconds: 60 },
        handle: async (input, ctx) =>
        {
            await ctx.services.products.remove(input.id);

            return { removed: true as const };
        },
    }),
];
