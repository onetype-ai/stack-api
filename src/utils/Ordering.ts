class OrderingUtil
{
    by(locale: string): Intl.Collator
    {
        return new Intl.Collator(locale === "sr" ? "sr-Latn" : locale, { sensitivity: "variant" });
    }
}

export const Ordering = new OrderingUtil();
