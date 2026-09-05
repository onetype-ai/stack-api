class TextUtil
{
    // NFD lifts a mark above a letter; a stroke through one is its own
    // character and has to be named.
    #stroked = new Map(Object.entries({
        ø: "o", đ: "d", ł: "l", ħ: "h", ŧ: "t", ƀ: "b", ɖ: "d", ƶ: "z", ə: "e",
        æ: "ae", œ: "oe", ß: "ss", þ: "th", ð: "d", ŋ: "n", ı: "i",
    }));

    searched(raw: string): string
    {
        return this.#flattened(raw)
            .replace(/\p{Diacritic}/gu, "")
            .replace(/[øđłħŧƀɖƶəæœßþðŋı]/gu, (one) => this.#stroked.get(one) ?? one);
    }

    // NFC, not NFKD: NFKD makes "Model 2" and "Model ²" one name, and a shop
    // sells both.
    same(raw: string): string
    {
        return this.#flattened(raw).normalize("NFC");
    }

    // A letter that draws like another is only useful beside letters from a
    // different script. Folding them together would make "Рок" and "Pok" one
    // product, so this answers which alphabets are in play and the caller
    // decides.
    alphabets(raw: string): number
    {
        return [/\p{Script=Latin}/u, /\p{Script=Cyrillic}/u, /\p{Script=Greek}/u]
            .filter((one) => one.test(raw))
            .length;
    }

    characters(raw: string): number
    {
        return [...new Intl.Segmenter().segment(raw)].length;
    }

    units(raw: string): number
    {
        return raw.length;
    }

    visible(raw: string): string
    {
        // Every format character except the two joiners, which hold an emoji
        // family together and separate Persian and Hindi words: removing those
        // stores a different name than the one that was typed.
        return raw.replace(/[\p{Cf}\u00AD\u200B\uFEFF]/gu, (one) => (one === "\u200C" || one === "\u200D" ? one : ""));
    }

    #flattened(raw: string): string
    {
        return this.visible(raw)
            .normalize("NFD")
            .toLowerCase()
            .trim()
            .replace(/\s+/gu, " ");
    }
}

export const Text = new TextUtil();
