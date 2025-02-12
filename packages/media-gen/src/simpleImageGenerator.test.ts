import { describe, it } from "bun:test";
import { z } from "zod";
import { generateSimpleImage } from "./simpleImageGenerator";

const TestEnvsSchema = z.object({
  FAL_API_KEY: z.string(),
});
const testEnvs = TestEnvsSchema.parse(process.env);

describe("simpleImageGenerator", () => {
  it("should generate a large background image", async () => {
    const prompt =
      "Create a pixel art style image of a small, elderly man with gray hair and glasses, wearing a welding mask and gloves. He is focused on welding a small robot part on a workbench filled with tools and metal scraps. The scene should be colorful and lively, capturing the essence of a workshop environment, with sparks flying from the welding torch";

    const result = await generateSimpleImage(testEnvs.FAL_API_KEY, prompt, {
      imageSize: "square_hd",
      numImages: 1,
    });

    console.log("Generated image URL:", result[0].imageUrl);
    console.log("Image seed:", result[0].seed);
  }, 100000);
});
