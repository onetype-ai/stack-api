import { z } from "zod";

export const BeforeList = {
    schema: z.object({
        id: z.uuid(),
        name: z.string(),
        cents: z.number().int().nonnegative(),
    }),
};

export type BeforeList = z.infer<typeof BeforeList.schema>;
