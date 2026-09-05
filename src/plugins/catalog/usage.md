# catalog

## Description

What a shop sells. The first of two plugins: what one does alone, including
the parts that only matter once text and tenancy are real.

## Usage

```ts
import { Catalog } from "@plugins/catalog";

const product = await Catalog.get(ctx, id);
```

`catalog.read` lists and searches; `catalog.write` adds, moves and removes.
Every read answers only the caller's shop.

## What it demonstrates

- **scope** — `shopId` on the caller decides whose rows these are. Reads
  narrow through `ctx.scoped`, and a write is stamped through `ctx.stamped`,
  so a body naming another shop cannot place a row in it.
- **Ordering in the service** — `Intl.Collator`, never SQL, which sorts by
  code point and puts every accented name after Z.
- **Two folds** — one drops accents so a search for `Uber` finds `Über`; the
  other keeps them, so `Apfel` and `Äpfel` remain two products.
- **Counting characters** — a name is bounded by what a reader sees, in the
  schema as well as the parser, because `.max()` counts UTF-16 units.
- **A cursor, not an offset** — order is decided in the service, so a page
  number would shift the moment a product is written ahead of it.
- **Answered** — a 201 carrying `location`, which no schema can express.
- **hooks, commands, events** — each declared once, each with a test.

## Refuses

- No caller id: 401.
- A missing permission: 403, never naming which.
- No shop on the caller: 403, never a default shop.
- Another shop's product: 404, the same answer as one that never existed.
- A name over 120 characters, or empty once trimmed: 400.
- A second product whose name differs only by case, width or ligature: 409.
