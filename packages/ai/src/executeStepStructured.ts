import type { LiteralClient } from "@literalai/client";
import { TypeValidationError } from "ai";
import type { Logger } from "cat-logger";
import type { z } from "zod";
import { ZodError } from "zod";
import { fromError } from "zod-validation-error";
import { type AiProviderConfig, getProvider } from "./ai-types";

async function attemptErrorCorrection<T extends z.ZodType>({
	error,
	output,
	providerConfig,
	system,
	logger,
	stepId,
	stepName,
	literalClient,
}: {
	error: TypeValidationError;
	providerConfig: AiProviderConfig;
	system?: string;
	logger: Logger;
	stepId: string;
	stepName: string;
	literalClient: LiteralClient;
	output: ExecuteStepOutput;
}): Promise<z.infer<T>> {
	const validationError = fromError(error.cause as ZodError);
	logger.warn({
		msg: `Schema validation failed during ${stepName} step. Attempting to fix invalid response structure`,
		error: String(error.cause || error.value),
		stepId,
		stepName,
		validationError,
	});

	const errorPrompt = `
Your previous response failed schema validation. Here are the validation errors:
${validationError.toString()}

Please provide a new response that matches the required schema structure.

Original response:
${JSON.stringify(error.value, null, 2)}

Schema description:
${output.schemaDescription}`;

	logger.debug({
		msg: `Retrying ${stepName} step with error correction prompt`,
		prompt: errorPrompt,
	});

	const generateObjectInstrumented =
		literalClient.instrumentation.vercel.generateObject;

	try {
		const correctedResult = await generateObjectInstrumented({
			model: getProvider(providerConfig),
			temperature: output.temperature,
			prompt: errorPrompt,
			system,
			schema: output.outputSchema,
			schemaDescription: output.schemaDescription,
			schemaName: output.schemaName,
		});

		logger.debug({
			msg: `${stepName} step completed after error correction`,
			stepId,
		});

		return correctedResult.object as z.infer<T>;
	} catch (retryError) {
		logger.error({
			msg: `${stepName} step failed after error correction attempt`,
			error: retryError instanceof Error ? retryError.message : "Unknown error",
			stepId,
			modelId: providerConfig.modelId,
		});
		throw retryError;
	}
}

export type ExecuteStepOutput = {
	temperature: number;
	schemaDescription: string;
	schemaName: string;
	outputSchema: z.ZodType;
};

export interface ExecuteStepProps {
	stepId: string;
	stepName: string;
	input: string;
	system?: string;
	output: ExecuteStepOutput;
	providerConfig: AiProviderConfig;
	logger: Logger;
	literalClient: LiteralClient;
}

export const executeStepStructured = async <T extends z.ZodType>({
	stepId,
	stepName,
	input,
	system,
	logger,
	providerConfig,
	literalClient,
	output,
}: ExecuteStepProps): Promise<z.infer<T>> => {
	logger.debug({
		msg: `Executing ${stepName} step`,
		stepId,
		modelId: providerConfig.modelId,
		provider: providerConfig.provider,
	});

	logger.debug({
		msg: "Instrumenting generateObject",
	});

	const generateObjectInstrumented =
		literalClient.instrumentation.vercel.generateObject;

	try {
		const result = await generateObjectInstrumented({
			model: getProvider(providerConfig),
			temperature: output.temperature,
			prompt: input,
			system,
			schema: output.outputSchema,
			schemaDescription: output.schemaDescription,
			schemaName: output.schemaName,
			experimental_telemetry: { isEnabled: true },
			experimental_providerMetadata: {
				[providerConfig.provider]: { cacheControl: { type: "ephemeral" } },
			},
		});

		logger.debug({
			msg: `executeStep: ${stepName} step completed`,
		});

		return result.object as z.infer<T>;
	} catch (error) {
		logger.error({
			msg: `${stepName} step failed`,
			error: error instanceof Error ? error.message : "Unknown error",
			stepId,
			modelId: providerConfig.modelId,
		});
		if (TypeValidationError.isInstance(error)) {
			if (error.cause instanceof ZodError) {
				return attemptErrorCorrection<T>({
					error,
					providerConfig,
					system,
					logger,
					stepId,
					stepName,
					literalClient,
					output,
				});
			}
		}
		throw error;
	}
};
