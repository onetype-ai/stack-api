class OrderingUtil
{
    by(locale: string): Intl.Collator
    {
        // "sr" resolves to Cyrillic collation, which orders Latin text wrongly.
        return new Intl.Collator(locale === "sr" ? "sr-Latn" : locale, { sensitivity: "variant" });
    }
}

export const Ordering = new OrderingUtil();
