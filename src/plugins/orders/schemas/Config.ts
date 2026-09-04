import { z } from "zod";

export const Config = {
    schema: z.object({
        /** How long a reservation holds before it lets go. */
        holdSeconds: z.number().int().positive().default(900),

        /** Where a payment is taken. Absent means nothing is charged. */
        payments: z.url().startsWith("https://").optional(),

    }),
};

export type Config = z.infer<typeof Config.schema>;
