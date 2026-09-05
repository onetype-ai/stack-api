import type { Status } from "../schemas/Status";

export type Listing = {
    locale: string;
    status?: Status;
    after?: string;
};
