class PagingUtil
{
    from<Row extends { id: string }>(sorted: readonly Row[], size: number, after?: string):
        { page: readonly Row[]; after?: string }
    {
        const start = after === undefined ? 0 : sorted.findIndex((row) => row.id === after) + 1;
        const page = sorted.slice(start, start + size);
        const last = page.at(-1);

        return {
            page,
            ...(start + size < sorted.length && last !== undefined && { after: last.id }),
        };
    }
}

export const Paging = new PagingUtil();
