import { z } from "zod";

/**
 * What the payments partner answers.
 *
 * A schema, not a cast: their server is one breach away from an attacker's,
 * and `ctx.fetch` checks the host but never the shape.
 */
export const Charge = {
    schema: z.object({
        paid: z.boolean(),
        reference: z.string().min(1).max(200),
    }),
};

export type Charge = z.infer<typeof Charge.schema>;
