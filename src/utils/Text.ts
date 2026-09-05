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

    // NFC, not NFKD: NFKD makes "Model 2" and "Model ²" one name.
    same(raw: string): string
    {
        return this.#flattened(raw).normalize("NFC");
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
        return raw.replace(/[\p{Cf}\u00AD\u200B-\u200F\u2028-\u202F\u2060-\u206F\uFEFF]/gu, "");
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
