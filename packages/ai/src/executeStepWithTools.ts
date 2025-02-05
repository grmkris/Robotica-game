import type { LiteralClient } from "@literalai/client";
import type { Tool } from "ai";
import type { Logger } from "cat-logger";
import type { z } from "zod";
import { type AiProviderConfig, getProvider } from "./ai-types";

export interface ExecuteStepWithToolsProps {
	stepId: string;
	stepName: string;
	input: string;
	system?: string;
	logger: Logger;
	tools: Record<string, Tool>;
	providerConfig: AiProviderConfig;
	literalClient: LiteralClient;
}
/**
 * Functiuon like executeStep but for generateText that uses tools
 */
export const executeStepWithTools = async <T extends z.ZodType>({
	input,
	system,
	logger,
	tools,
	providerConfig,
	literalClient,
}: ExecuteStepWithToolsProps): Promise<z.infer<T>> => {
	logger.debug({
		msg: `Executing step with tools ${JSON.stringify(tools)}`,
	});

	const generateTextInstrumented =
		literalClient.instrumentation.vercel.generateText;
	try {
		const result = await generateTextInstrumented({
			model: getProvider(providerConfig),
			prompt: input,
			system,
			experimental_telemetry: { isEnabled: true },
			tools: tools,
		});

		logger.debug({
			msg: `Step with tools completed ${result.text}`,
			result: result.text,
		});

		return result.text as z.infer<T>;
	} catch (error) {
		logger.error({
			msg: `Step with tools failed ${error instanceof Error ? error.message : "Unknown error"}`,
			error: error instanceof Error ? error.message : "Unknown error",
		});
		throw error;
	}
};
