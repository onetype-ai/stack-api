import type { Context } from "@onetype/stack-api-kit";

import type { Config } from "../schemas/Config";
import type { Rows } from "./Rows";
import type { Services } from "./Services";

/** What a route in this plugin is handed. */
export type Inside = Context<Config, Services, Rows>;
