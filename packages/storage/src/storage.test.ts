import { beforeAll, describe, expect, it } from "bun:test";
import { z } from "zod";
import { createStorageClient, generateStorageKey, keyPrefixes } from ".";

const TestEnvSchema = z.object({
  BUCKET: z.string(),
  ENDPOINT: z.string(),
  ACCESS_KEY: z.string(),
  SECRET_KEY: z.string(),
});

const env = TestEnvSchema.parse(process.env);

const TEST_CREDENTIALS = {
  bucket: env.BUCKET,
  endPoint: env.ENDPOINT,
  accessKey: env.ACCESS_KEY,
  secretKey: env.SECRET_KEY,
};

describe("Storage Client", () => {
  const storage = createStorageClient(TEST_CREDENTIALS);
  const testBuffer = Buffer.from("test content");

  beforeAll(async () => {
    await storage.initialize();
  });

  describe("key generation", () => {
    it("should generate valid cat image keys", () => {
      const key = generateStorageKey("catImage", { extension: "jpg" });
      expect(key.startsWith(keyPrefixes.catImage)).toBe(true);
      expect(key.endsWith(".jpg")).toBe(true);
    });

    it("should generate valid user upload keys", () => {
      const key = generateStorageKey("userUpload");
      expect(key.startsWith(keyPrefixes.userUpload)).toBe(true);
    });
  });

  describe("storage operations", () => {
    it("should upload and download files", async () => {
      const key = generateStorageKey("catImage", { extension: "txt" });

      // Test upload
      await storage.upload(key, testBuffer, "text/plain");

      // Test download URL generation
      const downloadUrl = await storage.getDownloadUrl(key);
      expect(downloadUrl).toBeTruthy();
    });

    it("should generate upload URLs", async () => {
      const key = generateStorageKey("userUpload");
      const uploadUrl = await storage.getUploadUrl(key, 60, "image/jpeg");
      expect(uploadUrl).toBeTruthy();
    });

    it("should list objects with prefix", async () => {
      const key = generateStorageKey("catImage");
      await storage.upload(key, testBuffer);

      const items = await storage.list(keyPrefixes.catImage);
      expect(items.length).toBeGreaterThan(0);
      expect(items.some((item) => item === key)).toBe(true);
    });

    it("should remove objects", async () => {
      const key = generateStorageKey("catImage");
      await storage.upload(key, testBuffer);
      await storage.remove(key);

      const items = await storage.list(keyPrefixes.catImage);
      expect(items.includes(key)).toBe(false);
    });
  });
});
