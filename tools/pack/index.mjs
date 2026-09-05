//
// Folders as one readable file, and back again.
//
// A Packer is told which folder it owns and what may be packed out of it.
// Packing writes example.txt beside them and removes what it read, so there
// is one copy rather than two that drift apart. Reading that file is meant to
// replace walking the tree: every path and every line, in the order somebody
// would read them.
//
//   new Packer({ at: "src/plugins", demo: ["catalog"] }).run(argv)
//

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";

export class Packer
{
    mark = "==> ";

    constructor({ at, demo, name })
    {
        this.root = process.cwd();
        this.folder = join(this.root, ...at.split("/"));
        this.file = join(this.folder, "example.txt");
        this.demo = demo;
        this.name = name;
        this.at = at;
    }

    pack(asked)
    {
        const names = asked.length > 0 ? asked : this.demo;

        for (const name of names)
        {
            if (!existsSync(this.held(name)))
            {
                throw new Error(`No ${this.name} named "${name}" in ${this.at}/, so nothing was packed.`);
            }
        }

        const files = names.flatMap((name) => this.walk(this.held(name)).sort((one, two) =>
        {
            return this.weigh(one) - this.weigh(two) || one.localeCompare(two);
        }));

        if (files.length === 0)
        {
            throw new Error(`Those ${this.name}s hold no files, so nothing was packed.`);
        }

        let out = this.head(names);

        for (const file of files)
        {
            const path = relative(this.root, file).split(sep).join("/");
            const body = readFileSync(file, "utf8");

            if (body.split("\n").some((line) => line.startsWith(this.mark)))
            {
                throw new Error(`${path} holds a line starting with "${this.mark}", which would unpack wrongly.`);
            }

            out += `${this.mark}${path}\n${body}${body.endsWith("\n") ? "" : "\n"}`;
        }

        mkdirSync(this.folder, { recursive: true });
        writeFileSync(this.file, out);

        for (const name of names)
        {
            rmSync(this.held(name), { recursive: true, force: true });
        }

        console.log(`packed ${names.join(", ")} (${files.length} files) into ${relative(this.root, this.file)}`);
    }

    unpack()
    {
        if (!existsSync(this.file))
        {
            throw new Error(`No ${relative(this.root, this.file)} to unpack.`);
        }

        const files = this.read(readFileSync(this.file, "utf8"));

        if (files.length === 0)
        {
            throw new Error(`${relative(this.root, this.file)} names no files, so nothing was written.`);
        }

        for (const [named] of files)
        {
            if (!join(this.root, named).startsWith(`${this.folder}${sep}`))
            {
                throw new Error(`"${named}" is outside ${this.at}/, so nothing was written.`);
            }
        }

        const depth = this.at.split("/").length;
        const names = [...new Set(files.map(([named]) => (named.split("/")[depth] ?? "").replace(/\.tsx?$/, "")))];

        for (const name of names)
        {
            rmSync(join(this.folder, name), { recursive: true, force: true });
        }

        for (const [named, body] of files)
        {
            const full = join(this.root, named);

            mkdirSync(dirname(full), { recursive: true });
            writeFileSync(full, body.endsWith("\n") ? body : `${body}\n`);
        }

        console.log(`unpacked ${names.join(", ")} (${files.length} files) into ${relative(this.root, this.folder)}`);
    }

    read(packed)
    {
        const files = [];

        let path = null;
        let body = [];

        for (const line of packed.split("\n"))
        {
            if (line.startsWith(this.mark))
            {
                if (path !== null)
                {
                    files.push([path, body.join("\n")]);
                }

                path = line.slice(this.mark.length).trim();
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

        return files;
    }

    held(name)
    {
        const folder = join(this.folder, name);

        return existsSync(folder) && statSync(folder).isDirectory() ? folder : `${folder}.ts`;
    }

    walk(at)
    {
        if (!statSync(at).isDirectory())
        {
            return at === this.file ? [] : [at];
        }

        const found = [];

        for (const entry of readdirSync(at))
        {
            const full = join(at, entry);

            if (statSync(full).isDirectory())
            {
                found.push(...this.walk(full));
                continue;
            }

            if (full !== this.file)
            {
                found.push(full);
            }
        }

        return found;
    }

    weigh(path)
    {
        const name = path.split(sep).pop() ?? "";

        if (name === "plugin.ts")
        {
            return 0;
        }

        return name === "usage.md" || name === "index.ts" ? 1 : 2;
    }

    head(names)
    {
        return `# ${names.join(", ")} packed

Every file of ${names.length === 1 ? `this ${this.name}` : `these ${this.name}s`}, one after another. A line starting
with "${this.mark}" opens a file and names its path; everything until the next
such line is that file, byte for byte.

Rebuild the folders with:  node tools/pack/${this.name}s.mjs unpack
Rewrite this file with:    node tools/pack/${this.name}s.mjs pack ${names.join(" ")}

`;
    }

    ran(argv)
    {
        try
        {
            this.run(argv);
        }
        catch (error)
        {
            console.error(error instanceof Error ? error.message : error);
            process.exit(1);
        }
    }

    run(argv)
    {
        const [asked, ...names] = argv;

        if (asked === "pack")
        {
            this.pack(names);
            return;
        }

        if (asked === "unpack")
        {
            this.unpack();
            return;
        }

        console.error(`Usage: node tools/pack/${this.name}s.mjs pack [name...] | unpack`);
        process.exit(1);
    }
}
