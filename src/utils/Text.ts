class TextUtil
{
    searched(raw: string): string
    {
        return this.#flattened(raw).replace(/\p{Diacritic}/gu, "");
    }

    // Accents kept, so Apfel and Äpfel are two products, not one.
    same(raw: string): string
    {
        return this.#flattened(raw).normalize("NFC");
    }

    characters(raw: string): number
    {
        return [...new Intl.Segmenter().segment(raw)].length;
    }

    #flattened(raw: string): string
    {
        return raw
            .normalize("NFKD")
            .replace(/ß/gu, "ss")
            .replace(/[øØ]/gu, "o")
            .replace(/[đĐ]/gu, "d")
            .toLowerCase()
            .trim()
            .replace(/\s+/gu, " ");
    }
}

export const Text = new TextUtil();
