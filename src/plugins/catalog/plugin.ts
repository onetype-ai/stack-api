import { defineCommand, defineParticipant, definePlugin } from "@onetype/stack-api-kit";
import { z } from "zod";

import { BeforeList } from "./schemas/BeforeList";
import { Config } from "./schemas/Config";
import { PhotosService } from "./services/photos";
import { ProductsService } from "./services/products";
import { productRoutes } from "./routes/products";
import { photos } from "./tables/photos";
import { products } from "./tables/products";

import type { Inside } from "./types/Context";
import type { Rows } from "./types/Rows";
import type { Services } from "./types/Services";

export default definePlugin.over<Rows, Services>()("catalog", {
    version: "1.0.0",

    describe: "What a shop sells: products, their names in any language, and their prices.",

    dependsOn: [],

    config: Config.schema,

    tables: { products, photos },

    migrations: "./src/plugins/catalog/migrations",

    scope: {
        describe: "The shop a row belongs to.",
        claim: "shopId",
        tables: { products: "shopId", photos: "shopId" },
    },

    permissions: {
        "catalog.read": { describe: "See this shop's products." },
        "catalog.write": { describe: "Add, change and remove this shop's products." },
    },

    services: (ctx) =>
    {
        return { products: new ProductsService(ctx), photos: new PhotosService(ctx) };
    },

    routes: [...productRoutes],

    emits: {
        // A listener runs for nobody, so the shop travels in the payload.
        "catalog.product.added": {
            describe: "A product was added. Emitted after the transaction commits.",
            schema: z.object({ id: z.uuid(), shopId: z.string(), cents: z.number().int().nonnegative() }),
        },
        "catalog.product.status-changed": {
            describe: "A product moved between draft, listed and withdrawn.",
            schema: z.object({
                id: z.uuid(),
                shopId: z.string(),
                status: z.enum(["draft", "listed", "withdrawn"]),
            }),
        },
        "catalog.product.removed": {
            describe: "A product was removed, and nothing may still point at it.",
            schema: z.object({ id: z.uuid(), shopId: z.string() }),
        },
    },

    hooks: {
        "catalog.product.before-list": {
            describe: "Runs before a product is written. A string refuses it with that reason.",
            schema: BeforeList.schema,
        },
    },

    participates: {
        "catalog.product.before-list": defineParticipant<Inside>()(BeforeList.schema, {
            describe: "Refuses a shop that already holds as many products as its config allows.",
            handle: async (_asked, ctx) =>
            {
                const many = await ctx.services.products.countMine();

                return many >= ctx.config.maxPerShop
                    ? `This shop already holds ${String(many)} products, which is the most it may have.`
                    : undefined;
            },
        }),
    },

    commands: {
        "catalog.withdraw-drafts": defineCommand<Inside>()({
            describe: "Withdraws every product this shop left in draft.",
            requires: ["catalog.write"],

            schema: z.object({}),
            run: async (_given, ctx) =>
            {
                const drafts = await ctx.services.products.list({ locale: "en", status: "draft" });

                for (const product of drafts.products)
                {
                    await ctx.services.products.setStatus(product.id, "withdrawn");
                }

                ctx.log.info("drafts withdrawn", { count: drafts.products.length });
            },
        }),
    },

    setup: (ctx) =>
    {
        ctx.log.info("catalog ready", { pageSize: ctx.config.pageSize, locale: ctx.config.locale });
    },

    teardown: (ctx) =>
    {
        ctx.log.info("catalog stopped");
    },
});
