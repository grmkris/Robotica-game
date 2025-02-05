import { describe, it } from "bun:test";
import { z } from "zod";
import { createMediaGenClient } from "./createMediaGenClient";

const TestEnvsSchema = z.object({
  FAL_API_KEY: z.string(),
});
const testEnvs = TestEnvsSchema.parse(process.env);

describe("mediaGen", () => {
  it("should generate images", async () => {
    const mediaGen = createMediaGenClient({ falApiKey: testEnvs.FAL_API_KEY });
    const result = await mediaGen.generateImages({
      prompt:
        "Highly detailed studio portrait of a sophisticated cat CEO sitting at a modern glass desk, wearing a custom-tailored charcoal grey suit with a silk purple tie, typing on a MacBook with one paw while holding a golden pen in the other. The cat has a slight smirk. Background shows floor-to-ceiling windows with a blurred city skyline. Desk has a sleek name plate, a small succulent plant, and a crystal water glass. Professional corporate photography style with dramatic side lighting, shallow depth of field, 8K resolution, high-end commercial quality",
    });
    console.log(result);
  }, 100000000000);
});
