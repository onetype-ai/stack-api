class OrderingUtil
{
    by(locale: string): Intl.Collator
    {
        try
        {
            return new Intl.Collator(locale, { sensitivity: "variant" });
        }
        catch
        {
            // A tag Intl cannot read is a bad request, not a broken server, and
            // a list still has to come back in some order.
            return new Intl.Collator("en", { sensitivity: "variant" });
        }
    }
}

export const Ordering = new OrderingUtil();
