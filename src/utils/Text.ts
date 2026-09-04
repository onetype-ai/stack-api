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
 * What text goes through before a database sees it: SQLite folds ASCII only.
 *
 * Two folds, and that is the trap. A search for "Apfel" should find "Äpfel",
 * but they are two German words and a shop may sell both.
 */
export const Text = {
    /** What a search matches on: accents dropped, so Uber finds Über. */
    searched: (raw: string): string =>
    {
        return flattened(raw).replace(/\p{Diacritic}/gu, "");
    },

    /** What two names collide on: accents kept, so Apfel and Äpfel are two. */
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
