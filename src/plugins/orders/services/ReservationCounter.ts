export class ReservationCounter
{
    #taken = 0;

    increment(): void
    {
        this.#taken += 1;
    }

    count(): number
    {
        return this.#taken;
    }
}
