import { Client } from "minio";
import { customAlphabet } from "nanoid";
import { z } from "zod";

/**
 * Storage key prefixes for different types of content.
 * These prefixes help organize and identify different types of stored objects.
 */
export const keyPrefixes = {
  /** Prefix for robot battle images */
  robotBattle: "robot_battle",
  /** Prefix for user uploaded content */
  userUpload: "usr_upl",
  /** Prefix for system backup files */
  systemBackup: "sys_bak",
} as const;

type KeyPrefix = (typeof keyPrefixes)[keyof typeof keyPrefixes];
type StorageKey<T extends KeyPrefix> = `${T}${string}`;

/**
 * Creates a Zod schema for validating storage keys with a specific prefix
 * @param prefix - The prefix to validate against
 */
const createKeySchema = <T extends KeyPrefix>(prefix: T) =>
  z.custom<StorageKey<T>>(
    (val): val is StorageKey<T> =>
      typeof val === "string" && val.startsWith(prefix)
  );

// Export key types and their validators
export const RobotBattleKey = createKeySchema(keyPrefixes.robotBattle);
export type RobotBattleKey = z.infer<typeof RobotBattleKey>;
export const UserUploadKey = createKeySchema(keyPrefixes.userUpload);
export type UserUploadKey = z.infer<typeof UserUploadKey>;
export const SystemBackupKey = createKeySchema(keyPrefixes.systemBackup);
export type SystemBackupKey = z.infer<typeof SystemBackupKey>;

export interface GenerateKeyOptions {
  /** Length of the random part of the key (default: 12) */
  length?: number;
  /** Separator between prefix and random part (default: "_") */
  separator?: string;
  /** Optional file extension (e.g., "jpg") */
  extension?: string;
}

/**
 * Generates a unique storage key with the specified prefix
 * @param prefix - The prefix to use for the key
 * @param options - Key generation options
 * @returns A unique storage key
 */
export function generateStorageKey<T extends keyof typeof keyPrefixes>(
  prefix: T,
  { length = 12, separator = "_", extension }: GenerateKeyOptions = {}
): StorageKey<(typeof keyPrefixes)[T]> {
  const id = customAlphabet(
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
    length
  )();

  const key = `${keyPrefixes[prefix]}${separator}${id}${extension ? `.${extension}` : ""}`;
  return key as StorageKey<(typeof keyPrefixes)[T]>;
}

export interface StorageCredentials {
  /** S3-compatible storage endpoint */
  endPoint: string;
  /** Port number (optional) */
  port?: number;
  /** Whether to use SSL (defaults to true) */
  useSSL?: boolean;
  /** Access key for authentication */
  accessKey: string;
  /** Secret key for authentication */
  secretKey: string;
  /** Storage region (optional) */
  region?: string;
  /** Bucket name to use */
  bucket: string;
}

/**
 * Creates a storage client for managing files with type-safe keys
 * @param credentials - Storage configuration and credentials
 * @returns Storage client instance with typed operations
 */
export const createStorageClient = (credentials: StorageCredentials) => {
  const client = new Client({
    endPoint: credentials.endPoint,
    port: credentials.port,
    useSSL: credentials.useSSL ?? true,
    accessKey: credentials.accessKey,
    secretKey: credentials.secretKey,
    region: credentials.region,
  });

  /**
   * Initializes the storage bucket if it doesn't exist
   * @throws If bucket creation fails
   */
  const initialize = async () => {
    try {
      const exists = await client.bucketExists(credentials.bucket);
      if (!exists) {
        await client.makeBucket(credentials.bucket);
      }
    } catch (error) {
      throw new Error(`Failed to initialize storage bucket: ${error}`);
    }
  };

  /**
   * Uploads data to storage with the specified key
   * @param key - Storage key for the object
   * @param data - Buffer containing the data to upload
   * @param contentType - Optional MIME type of the content
   * @returns The storage key used
   * @throws If upload fails
   */
  const upload = async (
    key: RobotBattleKey | UserUploadKey,
    data: Buffer,
    contentType?: string
  ) => {
    try {
      await client.putObject(credentials.bucket, key, data, undefined, {
        "Content-Type": contentType,
      });
      return key;
    } catch (error) {
      throw new Error(`Failed to upload object: ${error}`);
    }
  };

  /**
   * Generates a pre-signed URL for uploading content
   * @param key - Storage key for the object
   * @param expirySeconds - URL expiration time in seconds
   * @param contentType - Optional MIME type of the content
   * @returns Pre-signed upload URL
   */
  const getUploadUrl = async (
    key: RobotBattleKey | UserUploadKey,
    expirySeconds = 3600
  ) => {
    try {
      return await client.presignedPutObject(
        credentials.bucket,
        key,
        expirySeconds
      );
    } catch (error) {
      throw new Error(`Failed to generate upload URL: ${error}`);
    }
  };

  /**
   * Generates a pre-signed URL for downloading content
   * @param key - Storage key for the object
   * @param expirySeconds - URL expiration time in seconds
   * @returns Pre-signed download URL
   */
  const getDownloadUrl = async (
    key: RobotBattleKey | UserUploadKey,
    expirySeconds = 3600
  ) => {
    try {
      return await client.presignedGetObject(
        credentials.bucket,
        key,
        expirySeconds
      );
    } catch (error) {
      throw new Error(`Failed to generate download URL: ${error}`);
    }
  };

  /**
   * Removes an object from storage
   * @param key - Storage key of the object to remove
   * @throws If removal fails
   */
  const remove = async (key: RobotBattleKey | UserUploadKey) => {
    try {
      await client.removeObject(credentials.bucket, key);
    } catch (error) {
      throw new Error(`Failed to remove object: ${error}`);
    }
  };

  /**
   * Lists objects with the specified prefix
   * @param prefix - Prefix to filter objects by
   * @returns Array of matching object keys
   * @throws If listing fails
   */
  const list = async (prefix: string) => {
    const objects: string[] = [];
    const stream = client.listObjects(credentials.bucket, prefix);

    return new Promise<string[]>((resolve, reject) => {
      stream.on("data", (obj) => {
        if (!obj.name) return;
        objects.push(obj.name);
      });
      stream.on("end", () => resolve(objects));
      stream.on("error", (err) =>
        reject(new Error(`Failed to list objects: ${err}`))
      );
    });
  };

  return {
    initialize,
    upload,
    getUploadUrl,
    getDownloadUrl,
    remove,
    list,
    generateKey: generateStorageKey,
  };
};

export type CatStorageClient = ReturnType<typeof createStorageClient>;

// Remove the automatic initialization at the bottom of the file and export a function instead
export const createDefaultStorage = () => {
  if (!process.env.ENDPOINT) throw new Error("Storage ENDPOINT not configured");
  if (!process.env.ACCESS_KEY)
    throw new Error("Storage ACCESS_KEY not configured");
  if (!process.env.SECRET_KEY)
    throw new Error("Storage SECRET_KEY not configured");
  if (!process.env.BUCKET) throw new Error("Storage BUCKET not configured");

  const storage = createStorageClient({
    endPoint: process.env.ENDPOINT,
    accessKey: process.env.ACCESS_KEY,
    secretKey: process.env.SECRET_KEY,
    bucket: process.env.BUCKET,
  });

  return storage;
};

// Export a lazy-initialized storage instance
let defaultStorage: ReturnType<typeof createStorageClient> | undefined;

export const storage = {
  get instance() {
    if (!defaultStorage) {
      defaultStorage = createDefaultStorage();
    }
    return defaultStorage;
  },

  async initialize() {
    try {
      await this.instance.initialize();
    } catch (error) {
      console.error("Failed to initialize storage:", error);
      throw error;
    }
  },
};
