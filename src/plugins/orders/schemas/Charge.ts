import { z } from "zod";

export const Charge = {
    schema: z.object({
        paid: z.boolean(),
        reference: z.string().min(1).max(200),
    }),
};

export type Charge = z.infer<typeof Charge.schema>;
