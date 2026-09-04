/** What both folds share: one width, one case, no doubled spaces. */
function flattened(raw: string): string
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

/**
 * What text has to be put through before a database sees it.
 *
 * SQLite compares and folds ASCII only, so anything that must match or must
 * be unique is folded here first, by the service, before it is stored.
 *
 * Matching and uniqueness need different folds, which is the trap: a search
 * for "Apfel" should find "Äpfel", but they are two German words and a shop
 * may sell both. So one fold drops accents and the other keeps them.
 */
export const Text = {
    /**
     * The form a search matches on. Accents dropped, so Uber finds Über.
     *
     * NFKD separates a letter from its accent so the accent can be removed,
     * and folds a ligature into its letters, so a name written with a single
     * `ﬁ` matches one written with `fi`.
     */
    searched: (raw: string): string =>
    {
        return flattened(raw).replace(/\p{Diacritic}/gu, "");
    },

    /**
     * The form two names collide on. Case, width and ligatures folded, and
     * accents kept: `Über` and `UBER` are one name, `Apfel` and `Äpfel` are
     * two.
     */
    same: (raw: string): string =>
    {
        return flattened(raw).normalize("NFC");
    },

    /** Characters a reader sees: an emoji family is one, not seven. */
    characters: (raw: string): number =>
    {
        return [...new Intl.Segmenter().segment(raw)].length;
    },

};
