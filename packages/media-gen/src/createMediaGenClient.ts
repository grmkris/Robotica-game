import { fal } from "@fal-ai/client";
import type { CatImageKey, createStorageClient } from "cat-storage";

export interface MediaGenCredentials {
  falApiKey: string;
}

export interface GeneratedImage {
  imageUrl: string;
  seed: number;
}

export interface CatImageGenerationOptions {
  prompt: string;
  seed?: number;
  imageSize?:
  | "square_hd"
  | "square"
  | "portrait_4_3"
  | "portrait_16_9"
  | "landscape_16_9"
  | "landscape_4_3";
  numImages?: number;
}

const DEFAULT_OPTIONS: Partial<CatImageGenerationOptions> = {
  imageSize: "square_hd",
  numImages: 1,
  seed: Math.floor(Math.random() * 1000000),
};

export interface ImageGenerationResult {
  images: GeneratedImage[];
  storageKeys?: CatImageKey[];
}

export const createMediaGenClient = (credentials: MediaGenCredentials) => {
  // Configure fal client with provided credentials
  fal.config({
    credentials: credentials.falApiKey,
  });

  const generateImages = async (
    options: CatImageGenerationOptions
  ): Promise<GeneratedImage[]> => {
    const finalOptions = { ...DEFAULT_OPTIONS, ...options };

    const result = await fal.subscribe("fal-ai/flux-lora", {
      input: {
        loras: [
          {
            path: "https://storage.googleapis.com/fal-flux-lora/8db57d41b42a48fc9417bab87d6bde97_pytorch_lora_weights.safetensors",
          },
        ],
        prompt: finalOptions.prompt,
        seed: finalOptions.seed,
        image_size: finalOptions.imageSize,
        num_images: finalOptions.numImages,
      },
    });

    if (!result.data.images) {
      throw new Error("No images generated");
    }

    return result.data.images.map((image: { url: string }, index: number) => ({
      imageUrl: image.url,
      seed: finalOptions.seed ?? 0 + index,
    }));
  };

  const generateAndStore = async (
    storage: ReturnType<typeof createStorageClient>,
    options: CatImageGenerationOptions
  ): Promise<ImageGenerationResult> => {
    const images = await generateImages(options);

    const storedKeys = await Promise.all(
      images.map(async (image) => {
        const key = storage.generateKey("catImage", {
          extension: "png",
        });

        const response = await fetch(image.imageUrl);
        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Failed to fetch image: ${text}`);
        }

        const imageBuffer = Buffer.from(await response.arrayBuffer());
        await storage.upload(key, imageBuffer, "image/png");

        return key;
      })
    );

    return {
      images,
      storageKeys: storedKeys,
    };
  };

  return {
    generateImages,
    generateAndStore,
  };
};

export type MediaGenClient = ReturnType<typeof createMediaGenClient>;
