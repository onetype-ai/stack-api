import { z } from "zod";

export const Status = {
    schema: z.enum(["reserved", "paid", "expired", "cancelled"]),
};

export type Status = z.infer<typeof Status.schema>;
