/**
 * How a list is put in order.
 *
 * Never in SQL: `ORDER BY` is code point order, so every accented word lands
 * after `Z`. A folded column would sort German correctly and Turkish wrongly,
 * where `Ş` follows `S` and `ı` precedes `i`. Only a collator knows that.
 */
export const Ordering = {
    by: (locale: string): Intl.Collator =>
    {
        // "sr" resolves to Cyrillic collation, which orders Latin text
        // wrongly. Serbian written in Latin means sr-Latn.
        return new Intl.Collator(locale === "sr" ? "sr-Latn" : locale, { sensitivity: "variant" });
    },
};
