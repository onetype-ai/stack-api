import { z } from "zod";

export const Photo = {
    schema: z.object({
        id: z.uuid(),
        // z.url() takes "javascript:alert(1)", and a browser runs it.
        url: z.url().refine(
            (url) => url.startsWith("https://") || url.startsWith("http://"),
            "A photo is fetched over http or https.",
        ).max(2000),
        position: z.number().int().nonnegative(),
    }),
};

export type Photo = z.infer<typeof Photo.schema>;
