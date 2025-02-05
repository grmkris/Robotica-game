import type { db } from "@/db/db";
import { CatThoughtsTable } from "@/db/schema/catAgent.db";
import { errorLogs } from "@/db/schema/errors.db";
import { env } from "@/env";
import { loadCatAgentState } from "@/routes/catAgent/chat-processor/handleInteraction";
import { MemoryExtractionSchema } from "@/routes/catAgent/chat-processor/interactionProcessingSchemas";
import { LiteralClient } from "@literalai/client";
import {
	executeStepStructured,
	executeStepText,
	executeStepWithTools,
} from "cat-ai";
import { createInstagramClient } from "cat-instagram";
import type { Logger } from "cat-logger";
import { createMediaGenClient } from "cat-media-gen";
import type { CatId } from "cat-sdk";
import { createInstagramTools, createTwitterTools } from "cat-tools";
import { createTwitterClient } from "cat-twitter";
import {
	createMemoryExtractionPromptForThoughtProcessing,
	createNewThoughtPrompt,
	createNewsSearchPrompt,
	createThoughtResponsePrompt,
	createThoughtResponsePromptWithTools,
} from "./newThoughtPrompts";
import {
	CatThoughtContent,
	CatThoughtResponseSchema,
} from "./newThoughtsSchema";
// Create the client instance
const literalClient = new LiteralClient({
	apiKey: env.LITERAL_AI_API_KEY,
});

export const handleNewThought = async (props: {
	db: db;
	logger: Logger;
	catId: CatId;
}) => {
	const { db, logger, catId } = props;
	const threadId = `cat-1-${catId}-thought-${env.ENVIRONMENT}`;

	logger.debug({
		threadId,
		msg: "Starting thought generation",
		catId,
	});

	// Create/get thread with consistent naming
	return literalClient
		.thread({
			id: threadId,
			name: `Cat ${catId} Thought Generation`,
			metadata: {
				catId,
				type: "thought_generation",
			},
		})
		.wrap(async () => {
			// generate new thought
			return await literalClient
				.run({
					name: "Generate New Thought",
					metadata: {
						catId,
						operation: "generate_thought",
					},
				})
				.wrap(async () => {
					// load cat state
					try {
						// Step 1: Load cat state
						const catState = await literalClient
							.step({
								name: `Load Cat ${catId} State`,
								type: "retrieval",
								metadata: {
									catId,
									operation: "load_state",
								},
							})
							.wrap(async () => {
								// load cat state
								return await loadCatAgentState({ db, catId, logger });
							});

						// Step 2: News Search
						const newsResult = await literalClient
							.step({
								name: "Search News",
								type: "llm",
								metadata: {
									catId,
									operation: "search_news",
								},
							})
							.wrap(async () => {
								// search news
								return await executeStepText({
									stepName: "news_search",
									input: createNewsSearchPrompt({
										cat: catState,
									}),
									logger,
									providerConfig: {
										apikey: env.GOOGLE_GEMINI_API_KEY,
										modelId: "gemini-2.0-flash-exp",
										provider: "google",
										metadata: {
											useSearchGrounding: true,
										},
									},
									literalClient,
									stepId: "news_search",
								});
							});

						// step 3: extract memories for thought processing
						const memoryExtractionForThoughtProcessing = await literalClient
							.step({
								name: "Extract Memories for Thought Processing",
								type: "llm",
								metadata: {
									catId,
									operation: "extract_memories_for_thought_processing",
								},
							})
							.wrap(async () => {
								return await executeStepStructured<
									typeof MemoryExtractionSchema
								>({
									stepName: "memory_extraction_for_thought_processing",
									input: createMemoryExtractionPromptForThoughtProcessing({
										newsResult,
										cat: catState,
									}),
									system:
										"You are a cat thought memory extractor. You are given a news and you need to extract memories that are relevant to the topics.",
									logger,
									providerConfig: {
										apikey: env.GOOGLE_GEMINI_API_KEY,
										modelId: "gemini-2.0-flash-exp",
										provider: "google",
									},
									literalClient,
									stepId: "memory_extraction_for_thought_processing",
									output: {
										outputSchema: MemoryExtractionSchema,
										schemaDescription:
											"The extracted memories for thought processing",
										schemaName: "MemoryExtractionForThoughtProcessing",
										temperature: 0.9,
									},
								});
							});

						// Step 3: Generate Thought
						const thoughtResult = await literalClient
							.step({
								name: "Generate Cat Thought",
								type: "llm",
								metadata: {
									catId,
									newsId: newsResult,
									operation: "generate_thought",
								},
							})
							.wrap(async () => {
								return await executeStepStructured<typeof CatThoughtContent>({
									stepName: "thought_generation",
									input: createNewThoughtPrompt({
										newsSearch: newsResult,
										memoryExtraction: memoryExtractionForThoughtProcessing,
										cat: catState,
									}),
									logger,
									providerConfig: {
										apikey: env.GOOGLE_GEMINI_API_KEY,
										modelId: "gemini-2.0-flash-exp",
										provider: "google",
									},
									literalClient,
									stepId: "thought_generation",
									output: {
										outputSchema: CatThoughtContent,
										schemaDescription: "The generated thought and its metadata",
										schemaName: "CatThoughtContent",
										temperature: 0.9,
									},
								});
							});

						// Store thought in database
						await literalClient
							.step({
								name: "Store New Thought",
								type: "run",
								metadata: {
									operation: "store_thought",
								},
							})
							.wrap(async () => {
								await db.insert(CatThoughtsTable).values({
									catId,
									type: thoughtResult.type,
									content: thoughtResult.content,
									emotion: thoughtResult.emotions,
									createdAt: new Date(),
								});
							});

						// step 5: plan response
						const thoughtResponse = await literalClient
							.step({
								name: "Plan Response",
								type: "llm",
								metadata: {
									catId,
									operation: "plan_response",
								},
							})
							.wrap(async () => {
								return await executeStepStructured<
									typeof CatThoughtResponseSchema
								>({
									stepName: "thought_response_planning",
									input: createThoughtResponsePrompt({
										newThought: thoughtResult,
										memoryExtractionForThoughtProcessing:
											memoryExtractionForThoughtProcessing,
									}),
									logger,
									providerConfig: {
										apikey: env.GOOGLE_GEMINI_API_KEY,
										modelId: "gemini-2.0-flash-exp",
										provider: "google",
									},
									literalClient,
									stepId: "thought_response_planning",
									output: {
										outputSchema: CatThoughtResponseSchema,
										schemaDescription: "The planned response for the cat",
										schemaName: "ThoughtResponse",
										temperature: 0.9,
									},
								});
							});

						// step 6: execute the response
						const response = await literalClient
							.step({
								name: "Execute Response",
								type: "run",
								metadata: {
									operation: "execute_response",
								},
							})
							.wrap(async () => {
								const instagramClient = createInstagramClient({
									username: env.IG_USERNAME,
									password: env.IG_PASSWORD,
								});
								const mediaGenClient = createMediaGenClient({
									falApiKey: env.FAL_API_KEY,
								});
								const twitterClient = createTwitterClient({
									username: env.TWITTER_USERNAME,
									password: env.TWITTER_PASSWORD,
								});

								return await executeStepWithTools({
									stepName: "execute_response",
									input: createThoughtResponsePromptWithTools({
										newThought: thoughtResponse,
										memoryExtractionForThoughtProcessing:
											memoryExtractionForThoughtProcessing,
									}),
									logger,
									tools: {
										...createInstagramTools({
											instagramClient,
											mediaGenClient,
										}),
										...createTwitterTools({
											twitterClient,
											mediaGenClient,
										}),
									},
									literalClient,
									stepId: "execute_response",
									providerConfig: {
										apikey: env.GOOGLE_GEMINI_API_KEY,
										modelId: "gemini-2.0-flash-exp",
										provider: "google",
									},
									system:
										"You are a helpful assistant that can execute responses for the cat",
								});
							});

						return {
							thought: thoughtResult,
							thoughtResponse: thoughtResponse,
							response: response,
						};
					} catch (error) {
						// Error handling
						await literalClient
							.step({
								name: "Handle Thought Generation Error",
								type: "system_message",
								metadata: {
									error:
										error instanceof Error ? error.message : "Unknown error",
									errorType:
										error instanceof Error ? error.constructor.name : "Unknown",
									operation: "handle_error",
								},
							})
							.wrap(async () => {
								logger.error({
									msg: "Thought generation failed",
									catId,
									error:
										error instanceof Error ? error.message : "Unknown error",
									errorType:
										error instanceof Error ? error.constructor.name : "Unknown",
								});

								// Log error
								await db.insert(errorLogs).values({
									entityType: "thought",
									entityId: catId,
									errorType: "thought-generation-error",
									error:
										error instanceof Error ? error.message : "Unknown error",
									createdAt: new Date(),
								});
							});
						throw error;
					}
				});
		});
};
