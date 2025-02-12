import { Environment } from "robot-sdk";
import { parseEnv } from "znv";
import { z } from "zod";
import { MnemonicSchema, AddressSchema } from "robot-onchain";

// Create basic string schemas for Drizzle compatibility
const mnemonicStringSchema = z.string().refine(
  (value) => {
    try {
      return MnemonicSchema.parse(value);
    } catch {
      return false;
    }
  },
  {
    message: "Invalid mnemonic phrase",
  }
);

const addressStringSchema = z.string().refine(
  (value) => {
    try {
      return AddressSchema.parse(value);
      // Also verify it starts with 0x
      return value.startsWith("0x");
    } catch {
      return false;
    }
  },
  {
    message: "Invalid Ethereum address",
  }
);

export const env = parseEnv(process.env, {
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z
    .string()
    .default("postgres://postgres:postgres@localhost:55321/postgres"),
  EMAIL_PROVIDER: z.enum(["console", "smtp", "resend"]).default("console"),

  // if email provider is smtp
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.preprocess(Number, z.number()).default(587),
  SMTP_USERNAME: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_SECURE: z
    .preprocess((v) => v === "true" || v === "1", z.boolean())
    .default(true),

  // if email provider is resend
  RESEND_API_KEY: z.string().optional(),

  // always required regardless of email provider
  EMAIL_FROM: z.string().default("hello@example.com"),

  STANDALONE: z.coerce.number().default(0),
  VITE_DATABASE_URL: z.string().optional(),
  VITE_BLOB_READ_WRITE_TOKEN: z.string().optional(),
  VITE_OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string(),

  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("debug"),
  GROQ_API_KEY: z.string(),
  OPENROUTER_API_KEY: z.string(),
  ENVIRONMENT: Environment,
  REOWN_PROJECT_ID: z.string().default("reown"),
  GOOGLE_GEMINI_API_KEY: z.string(),
  FAL_API_KEY: z.string(),

  IG_USERNAME: z.string(),
  IG_PASSWORD: z.string(),

  FREQUENCY_CONFIG: z.coerce.number().default(60),
  LITERAL_AI_API_KEY: z.string(),

  // Scheduler enablement flags
  ENABLE_THOUGHT_SCHEDULER: z.coerce.boolean().default(false),
  ENABLE_SOCIAL_MEDIA_SCHEDULER: z.coerce.boolean().default(false),

  // Scheduler frequencies (in minutes)
  THOUGHT_SCHEDULER_FREQUENCY: z.coerce.number().default(15), // default 15 minutes
  SOCIAL_MEDIA_SCHEDULER_FREQUENCY: z.coerce.number().default(60), // default 60 minutes

  TWITTER_USERNAME: z.string(),
  TWITTER_PASSWORD: z.string(),

  // Add OpenAI API key to the schema
  OPENAI_API_KEY: z.string(),

  // Add blockchain-related environment variables with proper types
  SIGNER_MNEMONIC: mnemonicStringSchema,
  CONTRACT_ADDRESS: addressStringSchema,
  AVALANCHE_RPC_URL: z.string(),
});
