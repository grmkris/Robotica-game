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
  robot1Description?: string;
  robot1VisualDescription?: string;
  robot2Description?: string;
  robot2VisualDescription?: string;
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

    try {
      // Download and resize both robot images
      await Promise.all([
        downloadAndResizeImage(options.robot1Url!, robot1Path, 768),
        downloadAndResizeImage(options.robot2Url!, robot2Path, 768),
      ]);

      // Join images with smaller gap and better positioning
      await joinImages([{ src: robot1Path }, { src: robot2Path }], {
        direction: "horizontal",
        align: "center",
        offset: 10,
      }).then((img) => img.toFile(combinedPath));

      const imageBuffer = await fs.readFile(combinedPath);
      const imageKey = storage.generateKey("robotBattle", {
        extension: "png",
      });
      await storage.upload(imageKey, imageBuffer, "image/png");
      const imageUrl = await storage.getDownloadUrl(imageKey);

      // Enhanced prompt for better robot preservation and scene creation
      const result = await fal.subscribe("fal-ai/flux-lora/image-to-image", {
        input: {
          prompt: `Epic robot battle scene. 
Left robot (${options.robot1VisualDescription || options.robot1Description}) and 
right robot (${options.robot2VisualDescription || options.robot2Description}) 
facing each other in a tense combat stance.

Important details to preserve:
- Maintain exact colors, materials, and distinctive features of both robots
- Keep all unique design elements, weapons, and armor intact
- Preserve the specific head designs and eye colors
- Keep the original proportions and scale of each robot

Scene composition:
- Dynamic battle arena environment
- Dramatic lighting highlighting each robot's unique features
- Subtle environmental effects (shadows, reflections, energy effects)
- Clear separation between robots while maintaining tension
- Professional studio-quality rendering, 8k resolution
- Unreal Engine 5 quality

The robots should look exactly like their original designs but positioned in an epic battle scene.`,
          image_url: imageUrl,
          strength: 0.65,
          num_inference_steps: 40,
          guidance_scale: 12,
          num_images: 1,
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
      logger?.error({
        msg: "Failed to generate battle image",
        error,
        errorDetails:
          error instanceof Error
            ? {
                message: error.message,
                stack: error.stack,
              }
            : undefined,
      });
      throw error;
    } finally {
      // Clean up temp files
      await Promise.all([
        fs.unlink(robot1Path).catch(() => {}),
        fs.unlink(robot2Path).catch(() => {}),
        fs.unlink(combinedPath).catch(() => {}),
      ]);
    }
  };

  const generateImageFromImage = async (
    options: ImageFromImageOptions,
    logger?: Logger
  ): Promise<GeneratedImage[]> => {
    try {
      // Use the same model as the first round for consistency
      const result = await fal.subscribe("fal-ai/flux-lora/image-to-image", {
        input: {
          prompt: `Continue the epic robot battle scene.
${options.prompt}

Important details to preserve:
- Maintain the exact appearance and design of both robots
- Keep all unique features, weapons, and armor details intact
- Preserve the specific colors and materials of each robot
- Maintain the scale and proportions of both robots

Scene composition:
- Dynamic battle environment with energy effects
- Dramatic lighting and shadows
- Professional studio-quality rendering
- Unreal Engine 5 quality, 8k resolution
- Seamless continuation of the previous battle moment`,
          image_url: options.sourceImageUrl,
          strength: 0.7, // Slightly higher than first round to allow for more movement
          num_inference_steps: 40,
          guidance_scale: 12,
          num_images: options.numImages ?? 1,
          output_format: "png",
        },
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === "IN_PROGRESS") {
            logger?.info({
              msg: "Generating battle round image",
              status: update.status,
              logs: update.logs.map((log) => log.message),
            });
          }
        },
      });

      if (!result.data.images?.length) {
        throw new Error("No images generated");
      }

      return result.data.images.map(
        (image: { url: string }, index: number) => ({
          imageUrl: image.url,
          seed: options.seed ?? 0 + index,
        })
      );
    } catch (error) {
      logger?.error({
        msg: "Failed to generate round image",
        error,
        sourceImageUrl: options.sourceImageUrl,
        prompt: options.prompt,
        errorDetails:
          error instanceof Error
            ? {
                message: error.message,
                stack: error.stack,
              }
            : undefined,
      });
      throw error;
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
  outputPath: string,
  size: number = 768
): Promise<void> {
  const response = await fetch(url);
  const buffer = Buffer.from(await response.arrayBuffer());

  await sharp(buffer)
    .resize(size, size, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(outputPath);
}

export type MediaGenClient = ReturnType<typeof createMediaGenClient>;
