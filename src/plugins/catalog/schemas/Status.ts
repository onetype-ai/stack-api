import { z } from "zod";

export const Status = {
    schema: z.enum(["draft", "listed", "withdrawn"]),
};

export type Status = z.infer<typeof Status.schema>;
