import { z } from "zod";

export const Config = {
    schema: z.object({
        holdSeconds: z.number().int().positive().default(900),

        payments: z.url().startsWith("https://").optional(),

    }),
};

export type Config = z.infer<typeof Config.schema>;
