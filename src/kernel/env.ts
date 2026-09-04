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

    number: (name: string, fallback: number): number =>
    {
        const value = Env.text(name);

        if (value === undefined)
        {
            return fallback;
        }

        const parsed = Number(value);

        if (!Number.isInteger(parsed) || parsed < 0)
        {
            throw new Error(`${name} must be a non-negative whole number. Received "${value}".`);
        }

        return parsed;
    },

    list: (name: string): readonly string[] =>
    {
        return (Env.text(name, "") ?? "")
            .split(",")
            .map((one) => one.trim())
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
