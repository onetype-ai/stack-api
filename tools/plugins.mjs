#!/usr/bin/env node
//
// Plugins as one readable file, and back again.
//
//   node tools/plugins.mjs pack                folders -> example.txt, folders removed
//   node tools/plugins.mjs pack a b            packs only a and b
//   node tools/plugins.mjs unpack              example.txt -> folders
//
// Packing with no names packs the demo pair. Reading example.txt is meant to
// replace walking the tree: one file, every path and every line, in the order
// somebody would read them.

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";

const ROOT = process.cwd();
const PLUGINS = join(ROOT, "src", "plugins");
const FILE = join(PLUGINS, "example.txt");

// What `pack` takes when nobody names anything.
const DEMO = ["catalog", "orders"];

// A line no source file starts with, so a body can never be mistaken for a
// header. The path follows it verbatim.
const MARK = "==> ";

const head = (names) => `# ${names.join(", ")} packed

Every file of ${names.length === 1 ? "this plugin" : "these plugins"}, one after another. A line starting with
"${MARK}" opens a file and names its path; everything until the next such line
is that file, byte for byte.

Rebuild the folders with:  node tools/plugins.mjs unpack
Rewrite this file with:    node tools/plugins.mjs pack ${names.join(" ")}

`;

const walk = (at) =>
{
    const found = [];

    for (const entry of readdirSync(at))
    {
        const full = join(at, entry);

        if (statSync(full).isDirectory())
        {
            found.push(...walk(full));
            continue;
        }

        if (full !== FILE)
        {
            found.push(full);
        }
    }

    return found;
};

// plugin.ts first, then usage.md and index.ts, then the rest by path: the
// order somebody reads a plugin in, not the order the filesystem hands over.
const weigh = (path) =>
{
    const name = path.split(sep).pop() ?? "";

    if (name === "plugin.ts")
    {
        return 0;
    }

    if (name === "usage.md" || name === "index.ts")
    {
        return 1;
    }

    return 2;
};

const pack = (asked) =>
{
    const names = asked.length > 0 ? asked : DEMO;

    for (const name of names)
    {
        if (!existsSync(join(PLUGINS, name)))
        {
            throw new Error(`No plugin named "${name}" in src/plugins/, so nothing was packed.`);
        }
    }

    const files = names.flatMap((name) =>
    {
        return walk(join(PLUGINS, name)).sort((one, two) =>
        {
            return weigh(one) - weigh(two) || one.localeCompare(two);
        });
    });

    if (files.length === 0)
    {
        throw new Error("Those plugins hold no files, so nothing was packed.");
    }

    let out = head(names);

    for (const file of files)
    {
        const path = relative(ROOT, file).split(sep).join("/");
        const body = readFileSync(file, "utf8");

        // A body already holding the marker at the start of a line would
        // unpack as two files, so packing refuses rather than lose one.
        if (body.split("\n").some((line) => line.startsWith(MARK)))
        {
            throw new Error(`${path} holds a line starting with "${MARK}", which would unpack wrongly.`);
        }

        out += `${MARK}${path}\n${body}${body.endsWith("\n") ? "" : "\n"}`;
    }

    mkdirSync(PLUGINS, { recursive: true });
    writeFileSync(FILE, out);

    // The file now holds every line, so the folders it came from are removed:
    // one copy, not two that drift apart.
    for (const name of names)
    {
        rmSync(join(PLUGINS, name), { recursive: true, force: true });
    }

    console.log(`packed ${names.join(", ")} (${files.length} files) into ${relative(ROOT, FILE)}`);
};

const unpack = () =>
{
    if (!existsSync(FILE))
    {
        throw new Error(`No ${relative(ROOT, FILE)} to unpack.`);
    }

    const packed = readFileSync(FILE, "utf8");
    const files = [];

    let path = null;
    let body = [];

    for (const line of packed.split("\n"))
    {
        if (line.startsWith(MARK))
        {
            if (path !== null)
            {
                files.push([path, body.join("\n")]);
            }

            path = line.slice(MARK.length).trim();
            body = [];
            continue;
        }

        if (path !== null)
        {
            body.push(line);
        }
    }

    if (path !== null)
    {
        files.push([path, body.join("\n")]);
    }

    if (files.length === 0)
    {
        throw new Error(`${relative(ROOT, FILE)} names no files, so nothing was written.`);
    }

    // Every path must land under src/plugins/, or a packed file could write
    // anywhere the process can reach.
    for (const [named] of files)
    {
        if (!join(ROOT, named).startsWith(`${PLUGINS}${sep}`))
        {
            throw new Error(`"${named}" is outside src/plugins/, so nothing was written.`);
        }
    }

    const names = [...new Set(files.map(([named]) => named.split("/")[2]))];

    for (const name of names)
    {
        rmSync(join(PLUGINS, name), { recursive: true, force: true });
    }

    for (const [named, content] of files)
    {
        const full = join(ROOT, named);

        mkdirSync(dirname(full), { recursive: true });
        writeFileSync(full, content.endsWith("\n") ? content : `${content}\n`);
    }

    console.log(`unpacked ${names.join(", ")} (${files.length} files) into ${relative(ROOT, PLUGINS)}`);
};

const [asked, ...names] = process.argv.slice(2);

try
{
    if (asked === "pack")
    {
        pack(names);
    }
    else if (asked === "unpack")
    {
        unpack();
    }
    else
    {
        console.error("Usage: node tools/plugins.mjs pack [name...] | unpack");
        process.exit(1);
    }
}
catch (error)
{
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
}
