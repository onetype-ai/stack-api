import { z } from "zod";

export const Config = {
    schema: z.object({
        pageSize: z.number().int().positive().max(100).default(25),
        maxPerShop: z.number().int().positive().default(500),

        /** What language a listing is ordered in when the caller names none. */
        locale: z.string().min(2).max(12).default("en"),
    }),
};

export type Config = z.infer<typeof Config.schema>;
