export class Reserving
{
    #taken = 0;

    took(): void
    {
        this.#taken += 1;
    }

    count(): number
    {
        return this.#taken;
    }
}
