import { describe, expect, test } from "vitest";
import { z } from "zod";

import { definePlugin } from "@onetype/stack-api-kit";
import { startTestKernel } from "@onetype/stack-api-kit/testing";

const guarded = definePlugin("probe", {
    version: "1.0.0",
    describe: "Owns a permission and a route behind it.",
    permissions: { "probe.read": { describe: "Read the probe." } },
    routes: [{
        method: "GET",
        path: "/probe",
        describe: "Answers whoever may read.",
        requires: ["probe.read"],
        input: z.object({}),
        output: z.object({ ok: z.boolean() }),
        handle: () => ({ ok: true }),
    }],
});

function signer(permissions: readonly string[] | undefined)
{
    return definePlugin("signer", {
        version: "1.0.0",
        describe: "Says who is calling.",
        dependsOn: ["probe"],
        identifies: () => ({ id: "one", claims: {}, ...(permissions !== undefined && { permissions }) }),
        grants: () => ["probe.read"],
        mayGrant: ["probe.read"],
    });
}

describe("the three keys reference.md writes signatures for", () =>
{
    test("grants fills permissions, which identifies never names", async () =>
    {
        const api = await startTestKernel({ plugins: [guarded, signer(undefined)] });

        expect((await api.kernel.identify?.(new Request("http://localhost/probe")))?.permissions)
            .toEqual(["probe.read"]);

        await api.stop();
    });

    test("one written into identifies is dropped, with no word said", async () =>
    {
        const api = await startTestKernel({ plugins: [guarded, signer(["probe.write"])] });

        expect((await api.kernel.identify?.(new Request("http://localhost/probe")))?.permissions)
            .toEqual(["probe.read"]);

        await api.stop();
    });
});
