import { MnemonicSchema } from "robot-onchain";
import { Environment } from "robot-sdk";
import { parseEnv } from "znv";
import { z } from "zod";

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
	},
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
	ANTHROPIC_API_KEY: z.string(),

	LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("debug"),
	OPENROUTER_API_KEY: z.string(),
	ENVIRONMENT: Environment,
	REOWN_PROJECT_ID: z.string().default("reown"),
	GOOGLE_GEMINI_API_KEY: z.string(),
	FAL_API_KEY: z.string(),

	LITERAL_AI_API_KEY: z.string(),

	// Add blockchain-related environment variables with proper types
	SIGNER_MNEMONIC: mnemonicStringSchema,
	CONTRACT_ADDRESS: z.string(),
	AVALANCHE_RPC_URL: z.string(),
});
