import {
  createMediaGenClient,
  type CatImageGenerationOptions,
} from "./createMediaGenClient";

export async function generateSimpleImage(
  falApiKey: string,
  prompt: string,
  options: Partial<CatImageGenerationOptions> = {}
) {
  const mediaGen = createMediaGenClient({ falApiKey });

  const result = await mediaGen.generateImages({
    prompt,
    imageSize: options.imageSize || "landscape_16_9", // Default to landscape for backgrounds
    numImages: options.numImages || 1,
    seed: options.seed,
  });

  return result;
}
