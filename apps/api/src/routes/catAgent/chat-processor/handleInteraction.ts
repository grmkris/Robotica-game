import type { db } from "@/db/db";
import {
	CatActivitiesTable,
	CatInteractionsTable,
	CatMemoriesTable,
	CatTable,
	CatThoughtsTable,
	CatUserAffectionsTable,
} from "@/db/schema/catAgent.db";
import { errorLogs } from "@/db/schema/errors.db";
import type {
	SelectCatSchema,
	SelectInteractionSchema,
	SelectItemSchema,
	SelectUserSchema,
} from "@/db/schema/schemas.db";
import { users } from "@/db/schema/users.db";
import { env } from "@/env";
import {
	type CatResponse,
	InteractionAnalysisSchema,
	MemoryExtractionSchema,
	ResponsePlanSchema,
} from "@/routes/catAgent/chat-processor/interactionProcessingSchemas";
import {
	createAnalysisPrompt,
	createMemoryExtractionPrompt,
	createResponsePrompt,
} from "@/routes/catAgent/chat-processor/interactionPrompts";
import { LiteralClient } from "@literalai/client";
import { executeStepStructured } from "cat-ai";
import type { Logger } from "cat-logger";
import type { CatId, CatInteractionId, InteractionType, UserId } from "cat-sdk";
import { and, desc, eq, sql } from "drizzle-orm";
import type { ZodError } from "zod";

// Create the client instance
const literalClient = new LiteralClient({
	apiKey: env.LITERAL_AI_API_KEY,
});

class ValidationError extends Error {
	constructor(
		message: string,
		public readonly errors: ZodError | string,
	) {
		super(message);
		this.name = "ValidationError";
	}
}

// Modify the interact function to use processInteraction and generateResponse
export const handleInteraction = async (props: {
	db: db;
	logger: Logger;
	interaction: {
		id: CatInteractionId;
		type: InteractionType;
		input: string;
		item?: SelectItemSchema;
	};
	catId: CatId;
	userId: UserId;
}): Promise<CatResponse> => {
	const { db, logger, interaction, catId, userId } = props;
	const threadId = `cat-${catId}-interaction-${env.ENVIRONMENT}`;
	logger.debug({
		threadId,
		msg: "Starting interaction",
		interactionId: interaction.id,
		interactionType: interaction.type,
		catId,
		userId,
	});

	// Create/get thread with consistent naming
	return literalClient
		.thread({
			id: threadId,
			name: `Cat ${catId} website Interaction`,

			metadata: {
				catId,
				interactionId: interaction.id,
				interactionType: interaction.type,
				userId,
			},
		})
		.wrap(async () => {
			return await literalClient
				.run({
					input: {
						userinput: interaction.input,
					},
					name: `Process ${interaction.type} Interaction`,
					metadata: {
						interactionId: interaction.id,
						type: interaction.type,
						catId,
						userId,
					},
				})
				.wrap(async () => {
					try {
						// Load cat state with descriptive step name
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
								return await loadCatAgentState({ db, catId, logger });
							});

						// Load user with descriptive step name
						const user = await literalClient
							.step({
								name: `Load User ${userId} Data`,
								type: "retrieval",
								metadata: {
									userId,
									operation: "load_user",
								},
							})
							.wrap(async () => {
								return await getUserById({ db, userId, catId });
							});

						// Analysis step with better naming
						const analysisResult = await literalClient
							.step({
								name: `Analyze ${interaction.type} Interaction`,
								type: "llm",
								metadata: {
									catId,
									interactionType: interaction.type,
									operation: "analyze_interaction",
								},
							})
							.wrap(async () => {
								return await executeStepStructured<
									typeof InteractionAnalysisSchema
								>({
									stepName: "analysis",
									input: interaction.input,
									system: createAnalysisPrompt({
										item: interaction.item,
										input: interaction.input,
										interactionType: interaction.type,
										user,
										catState,
									}),
									logger,
									providerConfig: {
										apikey: env.GOOGLE_GEMINI_API_KEY,
										modelId: "gemini-2.0-flash-exp",
										provider: "google",
									},
									literalClient,
									stepId: "analysis",
									output: {
										outputSchema: InteractionAnalysisSchema,
										schemaDescription: "The analysis of the interaction",
										schemaName: "InteractionAnalysis",
										temperature: 0.8,
									},
								});
							});

						// Memory extraction with better naming
						const memoryResult = await literalClient
							.step({
								name: "Extract Memories from Interaction",
								type: "llm",
								metadata: {
									catId,
									analysisId: analysisResult,
									operation: "extract_memories",
								},
							})
							.wrap(async () => {
								return await executeStepStructured<
									typeof MemoryExtractionSchema
								>({
									stepName: "memory",
									input: interaction.input,
									system: createMemoryExtractionPrompt({
										catState,
										item: interaction.item,
										input: interaction.input,
										interactionType: interaction.type,
										user,
									}),
									logger,
									providerConfig: {
										apikey: env.GOOGLE_GEMINI_API_KEY,
										modelId: "gemini-2.0-flash-exp",
										provider: "google",
									},
									literalClient,
									stepId: "memory",
									output: {
										outputSchema: MemoryExtractionSchema,
										schemaDescription: "The extraction of relevant memories",
										schemaName: "MemoryExtraction",
										temperature: 0.7,
									},
								});
							});

						// Response generation with better naming
						const responseResult = await literalClient
							.step({
								name: "Generate Cat Response",
								type: "llm",
								metadata: {
									catId,
									analysisId: analysisResult,
									memoryId: memoryResult,
									operation: "generate_response",
								},
							})
							.wrap(async () => {
								return await executeStepStructured<typeof ResponsePlanSchema>({
									stepName: "response",
									input: interaction.input ?? "",
									system: createResponsePrompt({
										catState,
										analysis: analysisResult,
										memories: memoryResult,
										user,
									}),
									logger,
									providerConfig: {
										apikey: env.GOOGLE_GEMINI_API_KEY,
										modelId: "gemini-2.0-flash-exp",
										provider: "google",
									},
									literalClient,
									stepId: "response",
									output: {
										outputSchema: ResponsePlanSchema,
										schemaDescription: "The response plan for the interaction",
										schemaName: "ResponsePlan",
										temperature: 0.5,
									},
								});
							});

						const finalResponse: CatResponse = {
							hungerDelta: responseResult.stateChange.hungerDelta,
							happinessDelta: responseResult.stateChange.happinessDelta,
							energyDelta: responseResult.stateChange.energyDelta,
							userAffectionDelta: responseResult.stateChange.userAffectionDelta,
							thoughtProcess: analysisResult.thoughtProcess,
							newMemory: responseResult.stateChange.newMemory,
							newActivity: responseResult.stateChange.newActivity,
							newLocation: responseResult.stateChange.newLocation,
							response: responseResult.response,
							emotionalState: responseResult.stateChange.emotionalState,
						};

						// Database updates with better naming
						await literalClient
							.step({
								name: "Persist Interaction Results",
								type: "run",
								metadata: {
									operation: "update_state",
									updates: {
										hunger: finalResponse.hungerDelta,
										happiness: finalResponse.happinessDelta,
										energy: finalResponse.energyDelta,
										affection: finalResponse.userAffectionDelta,
									},
								},
							})
							.wrap(async () => {
								await db
									.insert(CatUserAffectionsTable)
									.values({
										catId,
										userId,
										affection: 0 + finalResponse.userAffectionDelta,
										updatedAt: new Date(),
									})
									.onConflictDoUpdate({
										target: [
											CatUserAffectionsTable.catId,
											CatUserAffectionsTable.userId,
										],
										set: {
											affection: sql`${CatUserAffectionsTable.affection} + ${finalResponse.userAffectionDelta}`,
											updatedAt: new Date(),
										},
									});

								if (finalResponse.newActivity || finalResponse.newLocation) {
									const latestActivity =
										await db.query.CatActivitiesTable.findFirst({
											where: and(eq(CatActivitiesTable.catId, catId)),
											orderBy: [desc(CatActivitiesTable.startTime)],
										});
									await db.insert(CatActivitiesTable).values({
										catId,
										activity:
											finalResponse.newActivity ??
											latestActivity?.activity ??
											"sleeping",
										location:
											finalResponse.newLocation ??
											latestActivity?.location ??
											"keyboard",
										startTime: new Date(),
										description: finalResponse.thoughtProcess,
									});
								}

								if (finalResponse.newMemory) {
									await db.insert(CatMemoriesTable).values({
										catId,
										userId,
										interactionId: interaction.id,
										memory: finalResponse.newMemory,
										createdAt: new Date(),
									});
								}

								await db.insert(CatThoughtsTable).values({
									catId,
									type: "OBSERVATION", // TODO
									content: finalResponse.thoughtProcess,
									emotion: finalResponse.emotionalState,
									createdAt: new Date(),
								});

								await db
									.update(CatInteractionsTable)
									.set({
										status: "COMPLETED",
										output: finalResponse.response,
										outputEmotion: finalResponse.emotionalState,
									})
									.where(eq(CatInteractionsTable.id, interaction.id));

								// Update cat state
								const currentState = await loadCatAgentState({
									db,
									catId,
									logger,
								});
								await db
									.update(CatTable)
									.set({
										hunger: currentState.hunger + finalResponse.hungerDelta,
										happiness:
											currentState.happiness + finalResponse.happinessDelta,
										energy: currentState.energy + finalResponse.energyDelta,
										updatedAt: new Date(),
									})
									.where(eq(CatTable.id, catId));
							});

						return finalResponse;
					} catch (error) {
						// Error handling with better naming
						await literalClient
							.step({
								name: "Handle Interaction Error",
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
									msg: "Interaction failed",
									interactionId: interaction.id,
									error:
										error instanceof Error ? error.message : "Unknown error",
									errorType:
										error instanceof Error ? error.constructor.name : "Unknown",
								});
								await handleError(db, interaction.id, error, logger);
							});
						throw error;
					}
				});
		});
};

// Add these helper functions after the existing imports

// Helper to load and validate cat state
export const loadCatAgentState = async (props: {
	db: db;
	catId: CatId;
	logger: Logger;
}): Promise<SelectCatSchema> => {
	const { db, catId, logger } = props;
	logger.debug({
		msg: "",
	});
	const state = await db.query.CatTable.findFirst({
		where: eq(CatTable.id, catId),
		with: {
			memories: {
				orderBy: [desc(CatMemoriesTable.createdAt)],
				limit: 100,
			},
			interactions: {
				orderBy: [desc(CatInteractionsTable.createdAt)],
				limit: 100,
				with: {
					user: {
						with: {
							catUserAffections: true,
							wallets: true,
						},
					},
					userItem: {
						with: {
							item: true,
						},
					},
				},
			},
			thoughts: {
				orderBy: [desc(CatThoughtsTable.createdAt)],
				limit: 100,
			},
			userAffections: true,
			activities: {
				orderBy: [desc(CatActivitiesTable.startTime)],
				limit: 100,
			},
		},
	});
	if (!state) throw new Error(`Cat state not found for ID: ${catId}`);
	return state;
};

// Helper to find username
export const getUserById = async (props: {
	db: db;
	userId: UserId;
	catId: CatId;
}): Promise<SelectUserSchema & { interactions: SelectInteractionSchema[] }> => {
	const { db, userId } = props;
	const user = await db.query.users.findFirst({
		where: eq(users.id, userId),
		with: {
			catUserAffections: {
				where: eq(CatUserAffectionsTable.catId, props.catId),
			},
			wallets: true,
			transactions: true,
			interactions: true,
		},
	});

	if (!user?.username) {
		throw new Error(`Username not found for user ID: ${userId}`);
	}

	return user;
};

// Helper to handle errors
export const handleError = async (
	db: db,
	interactionId: CatInteractionId,
	error: unknown,
	logger: Logger,
): Promise<void> => {
	logger.error({
		msg: "Interaction error",
		interactionId,
		error:
			error instanceof Error
				? {
						message: error.message,
						type: error.constructor.name,
						stack: error.stack,
					}
				: "Unknown error",
	});

	// Update interaction status
	await db
		.update(CatInteractionsTable)
		.set({
			status: "FAILED",
		})
		.where(eq(CatInteractionsTable.id, interactionId));

	// Log error
	await db.insert(errorLogs).values({
		entityType: "interaction",
		entityId: interactionId,
		errorType:
			error instanceof ValidationError
				? "interaction-validation-error"
				: "interaction-error",
		error: error instanceof Error ? error.message : "Unknown error",
		createdAt: new Date(),
	});

	// Log to console/monitoring
	logger.error({
		msg: "Error during interaction",
		interactionId,
		error: error instanceof Error ? error.message : String(error),
		stack: error instanceof Error ? error.stack : undefined,
	});
};
