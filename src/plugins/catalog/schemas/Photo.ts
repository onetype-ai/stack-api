import { z } from "zod";

export const Photo = {
    schema: z.object({
        id: z.uuid(),
        // z.url() takes "javascript:alert(1)": it is a url, and a browser runs
        // it. A picture is fetched, so only the schemes that fetch one.
        url: z.url().refine(
            (one) => one.startsWith("https://") || one.startsWith("http://"),
            "A photo is fetched over http or https.",
        ).max(2000),
        position: z.number().int().nonnegative(),
    }),
};

export type Photo = z.infer<typeof Photo.schema>;
