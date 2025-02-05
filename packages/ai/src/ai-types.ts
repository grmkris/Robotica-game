import { createAnthropic } from "@ai-sdk/anthropic";

import type { AnthropicProvider } from "@ai-sdk/anthropic";
import {
	type GoogleGenerativeAIProvider,
	createGoogleGenerativeAI,
} from "@ai-sdk/google";
import { type GroqProvider, createGroq } from "@ai-sdk/groq";
import {
	type OpenRouterProvider,
	createOpenRouter,
} from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";

export type ModelProvider = "groq" | "openrouter" | "anthropic" | "google";

// Extract the model ID type from the providers' function parameters
type AnthropicModelId = Parameters<AnthropicProvider>[0];
type GroqModelId = Parameters<GroqProvider>[0];
type OpenRouterModelId = Parameters<OpenRouterProvider>[0];
type GoogleGenerativeAIModelId = Parameters<GoogleGenerativeAIProvider>[0];

export type AiProviderConfig =
	| {
			provider: "anthropic";
			modelId: AnthropicModelId;
			apikey: string;
	  }
	| {
			provider: "groq";
			modelId: GroqModelId;
			apikey: string;
	  }
	| {
			provider: "openrouter";
			modelId: OpenRouterModelId;
			apikey: string;
	  }
	| {
			provider: "google";
			modelId: GoogleGenerativeAIModelId;
			apikey: string;
			metadata?: {
				useSearchGrounding?: boolean;
			};
	  };

export function getProvider(modelConfig: AiProviderConfig): LanguageModel {
	switch (modelConfig.provider) {
		case "anthropic":
			return createAnthropic({
				apiKey: modelConfig.apikey,
			})(modelConfig.modelId, { cacheControl: true });
		case "groq":
			return createGroq({
				apiKey: modelConfig.apikey,
			})(modelConfig.modelId);
		case "openrouter":
			return createOpenRouter({
				apiKey: modelConfig.apikey,
			})(modelConfig.modelId);
		case "google":
			return createGoogleGenerativeAI({
				apiKey: modelConfig.apikey,
			})(modelConfig.modelId, {
				useSearchGrounding: modelConfig.metadata?.useSearchGrounding ?? false,
			});
		default:
			throw new Error(`Unsupported provider: ${JSON.stringify(modelConfig)}`);
	}
}
export type { Tool } from "ai";
