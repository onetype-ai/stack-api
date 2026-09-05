import type { Context } from "@onetype/stack-api-kit";

import type { Config } from "../schemas/Config";
import type { Rows } from "./Rows";
import type { Services } from "./Services";

export type CatalogContext = Context<Config, Services, Rows>;
