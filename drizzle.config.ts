import { defineConfig } from "drizzle-kit";

// One config for every plugin and both dialects: `pnpm migrations <plugin> <name>` sets PLUGIN and KIT_DIALECT,
// and the kit's table() builds the tables for that dialect.
const plugin = process.env["PLUGIN"];
const dialect = process.env["KIT_DIALECT"] === "postgres" ? "postgres" : "sqlite";

if (plugin === undefined || plugin === "")
{
    throw new Error("drizzle.config.ts: PLUGIN is not set, so no plugin's tables can be read. Run pnpm migrations <plugin> <name>.");
}

export default defineConfig({
    dialect: dialect === "postgres" ? "postgresql" : "sqlite",
    schema: `./src/plugins/${plugin}/tables`,
    out: `./src/plugins/${plugin}/migrations/${dialect}`,
});
