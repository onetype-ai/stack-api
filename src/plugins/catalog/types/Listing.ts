import type { Status } from "../schemas/Status";

/** What a listing was asked for. Describes code, so it carries no schema. */
export type Listing = {
    locale: string;
    status?: Status;
    after?: string;
};
