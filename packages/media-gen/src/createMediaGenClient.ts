import { fal } from "@fal-ai/client";
import type { RobotBattleKey, createStorageClient } from "cat-storage";
import joinImages from "join-images";
import sharp from "sharp";
import { promises as fs } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import type { Logger } from "cat-logger";

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
  width?: number;
  height?: number;
}

const DEFAULT_OPTIONS: Partial<CatImageGenerationOptions> = {
  imageSize: "landscape_16_9",
  numImages: 1,
  seed: Math.floor(Math.random() * 1000000),
  width: 1024,
  height: 576,
};

export interface ImageGenerationResult {
  images: GeneratedImage[];
  storageKeys?: RobotBattleKey[];
}

export interface ImageToImageOptions extends CatImageGenerationOptions {
  robot1Url: string | null;
  robot2Url: string | null;
  initImageStrength?: number;
}

export interface ImageFromImageOptions extends CatImageGenerationOptions {
  sourceImageUrl: string;
  initImageStrength?: number;
}

export const createMediaGenClient = (credentials: MediaGenCredentials) => {
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
        const key = storage.generateKey("robotBattle", {
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

  async function createMask(
    width: number,
    height: number,
    outputPath: string
  ): Promise<void> {
    await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 1 },
      },
    })
      .png()
      .toFile(outputPath);
  }

  const generateImageToImage = async (
    storage: ReturnType<typeof createStorageClient>,
    options: ImageToImageOptions,
    logger?: Logger
  ): Promise<GeneratedImage[]> => {
    // If either URL is null, fall back to regular image generation
    if (!options.robot1Url || !options.robot2Url) {
      logger?.warn(
        "Missing robot image URL, falling back to regular image generation"
      );
      return generateImages(options);
    }

    const tempDir = tmpdir();
    const robot1Path = join(tempDir, `robot1_${Date.now()}.png`);
    const robot2Path = join(tempDir, `robot2_${Date.now()}.png`);
    const combinedPath = join(tempDir, `combined_${Date.now()}.png`);
    const maskPath = join(tempDir, `mask_${Date.now()}.png`);

    try {
      // Download and resize both robot images
      await Promise.all([
        downloadAndResizeImage(options.robot1Url!, robot1Path),
        downloadAndResizeImage(options.robot2Url!, robot2Path),
      ]);

      // Join images horizontally
      await joinImages([{ src: robot1Path }, { src: robot2Path }], {
        direction: "horizontal",
        align: "center",
        offset: 20,
      }).then((img) => img.toFile(combinedPath));

      // Get dimensions of combined image
      const metadata = await sharp(combinedPath).metadata();
      if (!metadata.width || !metadata.height) {
        throw new Error("Failed to get image dimensions");
      }

      // Create white mask of the same size
      await createMask(metadata.width, metadata.height, maskPath);

      // Upload both images
      const [imageUrl, maskUrl] = await Promise.all([
        (async () => {
          const imageBuffer = await fs.readFile(combinedPath);
          const imageKey = storage.generateKey("robotBattle", {
            extension: "png",
          });
          await storage.upload(imageKey, imageBuffer, "image/png");
          return storage.getDownloadUrl(imageKey);
        })(),
        (async () => {
          const maskBuffer = await fs.readFile(maskPath);
          const maskKey = storage.generateKey("robotBattle", {
            extension: "png",
          });
          await storage.upload(maskKey, maskBuffer, "image/png");
          return storage.getDownloadUrl(maskKey);
        })(),
      ]);

      // Use FLUX.1 Fill model
      console.log(options.prompt, "prompt for first round");
      const result = await fal.subscribe("fal-ai/flux-pro/v1/fill", {
        input: {
          prompt: options.prompt,
          image_url: imageUrl,
          mask_url: maskUrl,
          num_images: options.numImages ?? 1,
          safety_tolerance: "5",
          output_format: "png",
        },
      });

      return result.data.images.map(
        (image: { url: string }, index: number) => ({
          imageUrl: image.url,
          seed: options.seed ?? 0 + index,
        })
      );
    } catch (error) {
      logger?.error("Failed to generate battle image:", error);
      throw error;
    } finally {
      // Clean up temp files
      await Promise.all([
        fs.unlink(robot1Path).catch(() => {}),
        fs.unlink(robot2Path).catch(() => {}),
        fs.unlink(combinedPath).catch(() => {}),
        fs.unlink(maskPath).catch(() => {}),
      ]);
    }
  };

  const generateImageFromImage = async (
    storage: ReturnType<typeof createStorageClient>,
    options: ImageFromImageOptions,
    logger?: Logger
  ): Promise<GeneratedImage[]> => {
    const tempDir = tmpdir();
    const maskPath = join(tempDir, `mask_${Date.now()}.png`);

    try {
      // Get source image dimensions
      const response = await fetch(options.sourceImageUrl);
      const buffer = Buffer.from(await response.arrayBuffer());
      const metadata = await sharp(buffer).metadata();
      if (!metadata.width || !metadata.height) {
        throw new Error("Failed to get image dimensions");
      }

      // Create white mask
      await createMask(metadata.width, metadata.height, maskPath);

      // Upload mask
      const maskBuffer = await fs.readFile(maskPath);
      const maskKey = storage.generateKey("robotBattle", { extension: "png" });
      await storage.upload(maskKey, maskBuffer, "image/png");
      const maskUrl = await storage.getDownloadUrl(maskKey);

      console.log(options.prompt, "prompt for second round");
      const result = await fal.subscribe("fal-ai/flux-pro/v1/fill", {
        input: {
          prompt: options.prompt,
          image_url: options.sourceImageUrl,
          mask_url: maskUrl,
          num_images: options.numImages ?? 1,
          safety_tolerance: "5",
          output_format: "png",
        },
      });

      return result.data.images.map(
        (image: { url: string }, index: number) => ({
          imageUrl: image.url,
          seed: options.seed ?? 0 + index,
        })
      );
    } catch (error) {
      logger?.error("Failed to generate image from image:", error);
      throw error;
    } finally {
      await fs.unlink(maskPath).catch(() => {});
    }
  };

  return {
    generateImages,
    generateAndStore,
    generateImageToImage,
    generateImageFromImage,
  };
};

async function downloadAndResizeImage(
  url: string,
  outputPath: string
): Promise<void> {
  const response = await fetch(url);
  const buffer = Buffer.from(await response.arrayBuffer());

  await sharp(buffer)
    .resize(512, 512, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    })
    .png()
    .toFile(outputPath);
}

export type MediaGenClient = ReturnType<typeof createMediaGenClient>;
