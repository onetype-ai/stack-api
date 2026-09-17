# utils/

A class of methods any plugin may reach: `plugin.ts`, `index.ts`, a service,
a route, a schema. Exported as a singleton, so a caller never constructs one.

It takes values and returns values. Reaching a plugin or the kit is a lint
error: needing `ctx` means it is a service.

```ts
class <Name>Utils
{
    <method>(raw: string): string
    {
        return this.#<private>(raw);
    }

    #<private>(raw: string): string
    {
        return raw;
    }
}

export const <Name> = new <Name>Utils();
```
