import { getProvider } from "./ai-types";
import type { ExecuteStepProps } from "./executeStepStructured";

export const executeStepText = async ({
	stepId,
	stepName,
	input,
	system,
	providerConfig,
	literalClient,
	logger,
}: Omit<ExecuteStepProps, "output">): Promise<string> => {
	logger.debug({
		msg: `Executing ${stepName} step`,
		stepId,
		modelId: providerConfig.modelId,
		provider: providerConfig.provider,
	});

	const generateTextInstrumented =
		literalClient.instrumentation.vercel.generateText;

	const result = await generateTextInstrumented({
		model: getProvider(providerConfig),
		prompt: input,
		system,
		experimental_telemetry: { isEnabled: true },
		experimental_providerMetadata: {
			[providerConfig.provider]: { cacheControl: { type: "ephemeral" } },
		},
	});

	logger.debug({
		msg: `executeStepText: ${stepName} step completed`,
	});

	return result.text;
};
