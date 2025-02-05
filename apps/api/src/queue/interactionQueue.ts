import { getDb } from "@/db/db";
import { CatInteractionsTable } from "@/db/schema/catAgent.db";
import type { SelectItemSchema } from "@/db/schema/schemas.db";
import { transactions, userItems, users } from "@/db/schema/users.db";
import { logger } from "@/logger";
import { handleInteraction } from "@/routes/catAgent/chat-processor/handleInteraction";
import { type ConnectionOptions, type Job, Queue, Worker } from "bullmq";
import type {
	CatId,
	CatInteractionId,
	InteractionType,
	UserId,
	UserItemId,
} from "cat-sdk";
import { INTERACTION_COSTS } from "cat-sdk";
import { and, eq } from "drizzle-orm";

// Define job data type
export interface InteractionJobData {
	interactionId: CatInteractionId;
	catId: CatId;
	userId: UserId;
	type: InteractionType;
	input?: string;
	userItemId?: UserItemId;
}

export interface QueueConfig {
	connection: ConnectionOptions;
	queueName?: string;
	workerConcurrency?: number;
}

export async function processJob(job: Job<InteractionJobData>) {
	logger.info(`Processing interaction job ${job.id}`, {
		jobId: job.id,
		interactionId: job.data.interactionId,
		type: job.data.type,
	});

	const { catId, userId, type, input, userItemId } = job.data;
	const db = getDb();

	try {
		// Get interaction cost
		const interactionCost = INTERACTION_COSTS[type];

		// Start transaction
		const pendingInteraction = await db.transaction(async (tx) => {
			// Check user's purrlon balance
			const currentUser = await tx.query.users.findFirst({
				where: eq(users.id, userId),
			});

			if (!currentUser) {
				throw new Error("User not found");
			}

			if (currentUser.purrlons < interactionCost) {
				throw new Error(
					`Insufficient purrlons. Required: ${interactionCost.toString()}, Available: ${currentUser.purrlons.toString()}`,
				);
			}

			let itemData: SelectItemSchema | undefined;
			if (userItemId) {
				// Fetch and validate user item
				const userItem = await tx.query.userItems.findFirst({
					where: and(
						eq(userItems.id, userItemId),
						eq(userItems.userId, userId),
					),
					with: {
						item: true,
					},
				});

				if (!userItem) {
					throw new Error("User item not found");
				}

				if (userItem.quantity <= 0) {
					throw new Error("Item is out of stock in user's inventory");
				}

				// Decrease item quantity
				await tx
					.update(userItems)
					.set({ quantity: userItem.quantity - 1 })
					.where(eq(userItems.id, userItemId));

				itemData = userItem.item;
			}

			// Deduct purrlons
			await tx
				.update(users)
				.set({
					purrlons: currentUser.purrlons - interactionCost,
				})
				.where(eq(users.id, userId));

			// Record the transaction
			await tx.insert(transactions).values({
				userId: userId,
				amount: -interactionCost,
				type: "SPENT",
				category: "INTERACTION",
				description: `Spent ${interactionCost.toString()} purrlons for ${type} interaction`,
			});

			// Create pending interaction
			const [newInteraction] = await tx
				.insert(CatInteractionsTable)
				.values({
					catId,
					userId: userId,
					type: type,
					input: input,
					userItemId: userItemId,
					cost: interactionCost,
					status: "PROCESSING",
				})
				.returning();

			return { interaction: newInteraction, itemData };
		});

		if (!input) {
			throw new Error("No input provided for interaction");
		}

		try {
			await db.transaction(async (tx) => {
				const result = await handleInteraction({
					catId,
					db: tx,
					logger,
					userId: userId,
					interaction: {
						id: pendingInteraction.interaction.id,
						type: type,
						input: input,
						item: pendingInteraction.itemData,
					},
				});

				// Update interaction with AI response
				await tx
					.update(CatInteractionsTable)
					.set({
						output: result.response,
						status: "COMPLETED",
					})
					.where(
						eq(CatInteractionsTable.id, pendingInteraction.interaction.id),
					);
			});
			logger.info(`Job ${job.id} completed successfully`, {
				jobId: job.id,
				interactionId: job.data.interactionId,
			});
		} catch (error) {
			logger.error({
				msg: `Job ${job.id} failed`,
				jobId: job.id,
				interactionId: job.data.interactionId,
				error: error instanceof Error ? error.message : "Unknown error",
			});
			await db
				.update(CatInteractionsTable)
				.set({
					status: "FAILED",
				})
				.where(eq(CatInteractionsTable.id, pendingInteraction.interaction.id));
			throw error;
		}
	} catch (error) {
		logger.error({
			msg: `Job ${job.id} failed`,
			jobId: job.id,
			interactionId: job.data.interactionId,
			error: error instanceof Error ? error.message : "Unknown error",
		});
		throw error;
	}
}

export type InteractionQueueService = {
	queue: Queue<InteractionJobData>;
	addJob: (data: InteractionJobData) => Promise<Job<InteractionJobData>>;
	close: () => Promise<void>;
};

export function createInteractionQueueService(
	config: QueueConfig,
): InteractionQueueService {
	logger.info("Initializing interaction queue service...", {
		queueName: config.queueName ?? "interaction-queue",
		workerConcurrency: config.workerConcurrency ?? 5,
	});

	const queue = new Queue<InteractionJobData>(
		config.queueName ?? "interaction-queue",
		{
			connection: config.connection,

			defaultJobOptions: {
				attempts: 0,
				backoff: {
					type: "exponential",
					delay: 1000,
				},
			},
		},
	);

	const worker = new Worker<InteractionJobData>(
		config.queueName ?? "interaction-queue",
		processJob,
		{
			connection: config.connection,
			concurrency: config.workerConcurrency ?? 1,
		},
	);

	// Add connection status logging
	worker.on("ready", () => {
		logger.info("Interaction queue worker is ready");
	});

	worker.on("error", (error) => {
		logger.error("Interaction queue worker error", { error: error.message });
	});

	// Existing error handling...
	worker.on("failed", async (job, err) => {
		logger.error(`Job ${job?.id} failed`, {
			jobId: job?.id,
			error: err.message,
			stack: err.stack,
		});
	});

	worker.on("completed", async (job) => {
		logger.info(`Job ${job.id} completed successfully`, {
			jobId: job.id,
			interactionId: job.data.interactionId,
		});
	});

	// Add drain event logging
	worker.on("drained", () => {
		logger.info("Interaction queue worker has processed all jobs");
	});

	return {
		queue,
		addJob: (data: InteractionJobData) => queue.add("interaction", data),
		close: async () => {
			logger.info("Closing interaction queue service...");
			await worker.close();
			await queue.close();
			logger.info("Interaction queue service closed");
		},
	};
}
