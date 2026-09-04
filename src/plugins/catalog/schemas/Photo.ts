import { z } from "zod";

export const Photo = {
    schema: z.object({
        id: z.uuid(),
        url: z.url(),
        position: z.number().int().nonnegative(),
    }),
};

export type Photo = z.infer<typeof Photo.schema>;
