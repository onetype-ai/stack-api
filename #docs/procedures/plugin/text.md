# Procedure: text

## SQLite sorts and folds ASCII only

```
ORDER BY s       Apfel, Ostern, Zebra, Äpfel, Österreich, über
Intl.Collator    Apfel, Äpfel, Ostern, Österreich, über, Zebra
```

`lower('ÄÖÜ')` answers `ÄÖÜ`, `LIKE '%über%'` misses `Übergrößen`, `NOCASE`
folds A to Z and nothing else.

Two problems, not one. **Ordering** is `Intl.Collator` in the service, so a
page is a cursor naming the last row, re-found with the same comparator, never
`LIMIT/OFFSET`. **Matching** is a folded column the service writes, and is
wrong in Turkish: never order on one.

Matching and uniqueness want different folds: `Apfel` should find `Äpfel`, but
a shop may sell both.

## A character is three different numbers

`"👨‍👩‍👧‍👦"` is length 11, code points 7, graphemes 1. `z.string().max(200)`
counts UTF-16 units and calls them characters. Bound what you mean:
`Intl.Segmenter` for characters, `TextEncoder` for bytes. `Array.from` counts
code points, which is neither. The kit bounds a body in bytes.

A cheap `.max()` on the route with an exact count in the parser is the usual
pair.

## Normalisation and locale

Normalise where text enters, with `raw.normalize("NFC")`.

A schema's message is English; the kit has no locale. A caller needing
otherwise translates a `Refusal`'s `code`.
