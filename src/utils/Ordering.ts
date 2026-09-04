/**
 * How a list is put in order. Never in SQL, which sorts by code point.
 *
 * A folded column is not the way around that either: it sorts German right
 * and Turkish wrong, where `Ş` follows `S` and `ı` precedes `i`.
 */
export const Ordering = {
    by: (locale: string): Intl.Collator =>
    {
        // "sr" resolves to Cyrillic collation, which orders Latin text
        // wrongly. Serbian written in Latin means sr-Latn.
        return new Intl.Collator(locale === "sr" ? "sr-Latn" : locale, { sensitivity: "variant" });
    },
};
