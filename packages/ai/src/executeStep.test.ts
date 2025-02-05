import { LiteralClient } from "@literalai/client";
import { describe, it } from "bun:test";
import { createLogger } from "cat-logger";
import { z } from "zod";
import { executeStepText } from "./executeStepText";

const testEnvSchema = z.object({
	LITERAL_API_KEY: z.string(),
	OPENROUTER_API_KEY: z.string(),
});

const testEnv = testEnvSchema.parse(Bun.env);
const logger = createLogger({
	name: "test",
	level: "debug",
});

describe("executeStep", () => {
	it("should execute a step", async () => {
		const literalClient = new LiteralClient({
			apiKey: testEnv.LITERAL_API_KEY,
		});
		const result = await executeStepText({
			stepId: "test",
			stepName: "test",
			input:
				"Are you capable of browsing the twitter? what are the latest trending tweets?",
			providerConfig: {
				provider: "openrouter",
				modelId: "x-ai/grok-2-1212",
				apikey: testEnv.OPENROUTER_API_KEY,
			},
			literalClient,
			logger,
		});
		console.log(result);
	});
});
