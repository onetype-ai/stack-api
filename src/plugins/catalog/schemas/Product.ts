import { Refusal } from "@onetype/stack-api-kit";
import { z } from "zod";

import { Status } from "./Status";
import { Text } from "@utils/Text";

const LIMIT = 120;

export const Product = {
    schema: z.object({
        id: z.uuid(),

        // Bounded by what a reader counts, not by `.max()`, which counts
        // UTF-16 units: twenty emoji families are twenty characters and two
        // hundred and twenty units, and only one of those is the promise.
        name: z.string().refine((raw) => Text.characters(raw) <= LIMIT, {
            message: `A name is at most ${String(LIMIT)} characters.`,
        }),
        cents: z.number().int().nonnegative(),
        status: Status.schema,
        createdAt: z.iso.datetime(),
    }),

    limit: LIMIT,

    /**
     * The name as it will be stored, or a refusal saying why not.
     *
     * Normalised where it enters, because `é` written two ways compares
     * unequal, and one caller would write a name another could not find.
     */
    parseName: (raw: string): string =>
    {
        const name = raw.normalize("NFC").trim().replace(/\s+/gu, " ");
        const length = Text.characters(name);

        if (length === 0 || length > LIMIT)
        {
            throw new Refusal(
                400,
                "INVALID_NAME",
                `A name is 1 to ${String(LIMIT)} characters. This one is ${String(length)}.`,
                { name: `Between 1 and ${String(LIMIT)} characters.` },
            );
        }

        return name;
    },
};

export type Product = z.infer<typeof Product.schema>;
