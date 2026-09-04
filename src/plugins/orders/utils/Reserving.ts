/**
 * How many holds this process has taken since it started.
 *
 * Held rather than kept in a service, because a service is built per request:
 * one counting there would count to one, every time. Nothing durable belongs
 * here either, since a restart empties it.
 */
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
