export const Env = {
    text: (name: string, fallback?: string): string | undefined =>
    {
        const value = process.env[name];

        if (value === undefined)
        {
            return fallback;
        }

        if (value.length === 0)
        {
            throw new Error(`${name} must be a non-empty string when it is set.`);
        }

        return value;
    },

    required: (name: string): string =>
    {
        const value = Env.text(name);

        if (value === undefined)
        {
            throw new Error(`${name} is required and was not set.`);
        }

        return value;
    },

    /* A port of 0 binds anything free; a body limit of 0 refuses every write. */
    number: (name: string, fallback: number, least = 0, most = Number.MAX_SAFE_INTEGER): number =>
    {
        const value = Env.text(name);

        if (value === undefined)
        {
            return fallback;
        }

        /* Number("  ") is 0, and a stray space in a .env would read as one. */
        const parsed = value.trim() === "" ? Number.NaN : Number(value);

        if (!Number.isInteger(parsed) || parsed < least || parsed > most)
        {
            throw new Error(`${name} must be a whole number from ${String(least)} to ${String(most)}. Received "${value}".`);
        }

        return parsed;
    },

    /* Set and empty means nothing is allowed, which is the safe answer. */
    list: (name: string): readonly string[] =>
    {
        return (process.env[name] ?? "")
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean);
    },

    on: (name: string, fallback: boolean): boolean =>
    {
        const value = Env.text(name);

        if (value === undefined)
        {
            return fallback;
        }

        if (value !== "true" && value !== "false")
        {
            throw new Error(`${name} must be "true" or "false". Received "${value}".`);
        }

        return value === "true";
    },

    one: <Allowed extends string>(name: string, allowed: readonly Allowed[], fallback: Allowed): Allowed =>
    {
        const value = Env.text(name, fallback) ?? fallback;

        if (!allowed.includes(value as Allowed))
        {
            throw new Error(`${name} must be one of ${allowed.join(", ")}. Received "${value}".`);
        }

        return value as Allowed;
    },
};
