import { LiteralClient } from "@literalai/client";
import type { Tool } from "ai";
import { describe, it } from "bun:test";
import { createLogger } from "cat-logger";
import { z } from "zod";
import { executeStepWithTools } from "./executeStepWithTools";

const mockTool: Tool = {
	description: "This is a mock tool",
	parameters: z.object({
		foo: z.string(),
	}),
	execute: async (input) => {
		return input;
	},
};

const logger = createLogger({
	name: "executeStepWithTools",
	level: "debug",
});

const TestEnvSchema = z.object({
	ANTHROPIC_API_KEY: z.string(),
	INSTAGRAM_USERNAME: z.string(),
	INSTAGRAM_PASSWORD: z.string(),
	FAL_API_KEY: z.string(),
	LITERAL_API_KEY: z.string(),
});

const env = TestEnvSchema.parse(process.env);

describe("executeStepWithTools", () => {
	it("should execute a step with tools", async () => {
		const literalClient = new LiteralClient({
			apiKey: env.LITERAL_API_KEY,
		});
		const result = await executeStepWithTools({
			input:
				"Follow the system prompt and generate a prompt for an AI image generator to create a high-quality Instagram image. Main theme is a cat.",
			system: "This is a system prompt",
			logger: logger,
			tools: {
				mockTool,
			},
			providerConfig: {
				provider: "anthropic",
				modelId: "claude-3-5-haiku-latest",
				apikey: env.ANTHROPIC_API_KEY,
			},
			stepName: "createInstagramPost",
			stepId: "1",
			literalClient: literalClient,
		});

		console.log("Result", result);
	}, 100000000000);
});
