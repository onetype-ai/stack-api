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
            .replace(/[øđłħŧƀɖƶəæœßþðŋı]/gu, (letter) => this.#stroked.get(letter) ?? letter);
    }

    // NFC, not NFKD: NFKD makes "Model 2" and "Model ²" one name, and a shop
    // sells both. Ligatures live in their own range, so they fold on their own.
    same(raw: string): string
    {
        return this.#flattened(raw)
            .replace(/[\uFB00-\uFB06]/gu, (tie) => TextUtil.#tied.get(tie) ?? tie)
            .normalize("NFC");
    }

    static #tied = new Map(Object.entries({
        "\uFB00": "ff", "\uFB01": "fi", "\uFB02": "fl",
        "\uFB03": "ffi", "\uFB04": "ffl", "\uFB05": "st", "\uFB06": "st",
    }));

    // A word written in two alphabets is one letter pretending to be another:
    // "Widgеt" with a Cyrillic e. A name may hold several alphabets, because
    // "iPhone 15 Про" is what a Russian shop sells, but no single word may.
    mixed(raw: string): boolean
    {
        return this.visible(raw).split(/\s+/u).some((word) =>
        {
            return TextUtil.#alphabets.filter((alphabet) => alphabet.test(word)).length > 1;
        });
    }

    static #alphabets = [
        /\p{Script=Latin}/u, /\p{Script=Cyrillic}/u, /\p{Script=Greek}/u,
        /\p{Script=Cherokee}/u, /\p{Script=Armenian}/u, /\p{Script=Hebrew}/u,
        /\p{Script=Arabic}/u, /\p{Script=Han}/u, /\p{Script=Hangul}/u,
    ];

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
        return raw.replace(/[\p{Cf}\u00AD\u200B\uFEFF]/gu, (mark) => (mark === "\u200C" || mark === "\u200D" ? mark : ""));
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
