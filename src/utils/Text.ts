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
    // sells both. What NFKD also caught is done on purpose below.
    same(raw: string): string
    {
        return this.#confusable(this.#flattened(raw)).normalize("NFC");
    }

    // A letter that draws like another is the same letter to a reader, and a
    // second row nobody can tell from the first is how a listing is spoofed.
    #confusable(flat: string): string
    {
        return flat
            .replace(/[\uFF01-\uFF5E]/gu, (one) => String.fromCharCode(one.charCodeAt(0) - 0xFEE0))
            .replace(/[абвгдезиклмнопрстуфхцѕјѐ]/gu, (one) => TextUtil.#latin.get(one) ?? one);
    }

    static #latin = new Map(Object.entries({
        а: "a", б: "b", в: "b", г: "r", д: "d", е: "e", з: "3", и: "u", к: "k",
        л: "n", м: "m", н: "h", о: "o", п: "n", р: "p", с: "c", т: "t", у: "y",
        ф: "b", х: "x", ц: "u", ѕ: "s", ј: "j", ѐ: "e",
    }));

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
        // Not every format character: a joiner holds an emoji family together
        // and separates Persian and Hindi words, so removing it stores a
        // different name than the one that was typed.
        return raw.replace(/[\u00AD\u200B\u200E\u200F\u2028-\u202F\u2060-\u2064\u2066-\u206F\uFEFF]/gu, "");
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
