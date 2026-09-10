import { describe, expect, test } from "vitest";
import { z } from "zod";

import { definePlugin } from "@onetype/stack-api-kit";
import type { IdentifiedCaller } from "@onetype/stack-api-kit";
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

const signer = definePlugin("signer", {
    version: "1.0.0",
    describe: "Says who is calling.",
    dependsOn: ["probe"],
    identifies: () => ({ id: "one", claims: {} }),
    grants: () => ["probe.read"],
    mayGrant: ["probe.read"],
});

describe("the three keys reference.md writes signatures for", () =>
{
    test("grants fills permissions, which identifies never names", async () =>
    {
        const api = await startTestKernel({ plugins: [guarded, signer] });

        expect((await api.kernel.identify?.(new Request("http://localhost/probe")))?.permissions)
            .toEqual(["probe.read"]);

        await api.stop();
    });

    test("and one written into identifies does not compile, so it never reaches a caller", () =>
    {
        // @ts-expect-error permissions is `never` on what identifies answers:
        // grants fills them, and a plugin naming its own would grant itself any.
        const wrong = { id: "one", claims: {}, permissions: ["probe.write"] } satisfies IdentifiedCaller;

        expect(wrong.id).toBe("one");
    });
});
