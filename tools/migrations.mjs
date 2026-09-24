// Generates one migration step for a plugin, once a dialect, from its tables:
// pnpm migrations <plugin> <name>. Both folders gain the same number.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

const [plugin, name] = process.argv.slice(2);

if (plugin === undefined || name === undefined || !/^[a-z0-9_]+$/.test(name))
{
    process.stderr.write("migrations: name the plugin and the step, lowercase: pnpm migrations items add_due_date\n");
    process.exit(1);
}

if (!existsSync(`src/plugins/${plugin}/tables`))
{
    process.stderr.write(`migrations: src/plugins/${plugin}/tables does not exist. Name a plugin that declares tables.\n`);
    process.exit(1);
}

for (const dialect of ["sqlite", "postgres"])
{
    execFileSync("pnpm", ["exec", "drizzle-kit", "generate", "--name", name], { stdio: "inherit", env: { ...process.env, PLUGIN: plugin, KIT_DIALECT: dialect } });
}
