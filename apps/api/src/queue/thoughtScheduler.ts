import { getDb } from "@/db/db";
import { logger } from "@/logger";
import type { QueueRepeatOptions } from "@/queue/queue.utils";
import { handleNewThought } from "@/routes/catAgent/new-thought-processor/handleNewThought";
import type { ConnectionOptions, RepeatableJob } from "bullmq";
import { type Job, Queue, Worker } from "bullmq";
import type { CatId } from "cat-sdk";

// Define job data type
export interface ThoughtJobData {
	catId: CatId;
}

async function processThoughtJob(job: Job<ThoughtJobData>) {
	logger.debug({
		msg: `Starting to process thought job ${job.id}`,
		jobId: job.id,
		catId: job.data.catId,
		timestamp: new Date().toISOString(),
	});

	const { catId } = job.data;
	const db = getDb();

	try {
		await handleNewThought({
			catId,
			db,
			logger,
		});

		// Before AI execution
		logger.debug({
			msg: `Executing AI thought generation ${job.id}`,
			jobId: job.id,
			catId,
			timestamp: new Date().toISOString(),
		});

		logger.info({
			msg: `Thought job ${job.id} completed successfully`,
			jobId: job.id,
		});
	} catch (error) {
		logger.error({
			msg: `Thought job ${job.id} failed`,
			jobId: job.id,
			error: error instanceof Error ? error.message : "Unknown error",
		});
		throw error;
	}
}

export type ThoughtSchedulerService = {
	queue: Queue<ThoughtJobData>;
	upsertScheduler: (
		schedulerId: string,
		repeatOptions: QueueRepeatOptions,
		jobTemplate: {
			catId: CatId;
		},
	) => Promise<Job<ThoughtJobData>>;
	removeScheduler: (schedulerId: string) => Promise<boolean>;
	getSchedulers: (
		start?: number,
		end?: number,
		asc?: boolean,
	) => Promise<RepeatableJob[]>;
	close: () => Promise<void>;
};

/**
 * Configuration for the thought scheduler service
 * @property connection - Redis connection options for BullMQ
 * @property queueName - Optional custom queue name (defaults to "thought-queue")
 * @property workerConcurrency - Optional number of concurrent workers (defaults to 5)
 */
export interface ThoughtSchedulerConfig {
	connection: ConnectionOptions;
	queueName?: string;
	workerConcurrency?: number;
}

/**
 * Creates a thought scheduler service for managing autonomous cat thoughts
 * @param config - Configuration options for the scheduler service
 * @returns ThoughtSchedulerService instance with methods to manage thought scheduling
 */
export function createThoughtSchedulerService(
	config: ThoughtSchedulerConfig,
): ThoughtSchedulerService {
	logger.info("Initializing thought scheduler service...", {
		queueName: config.queueName ?? "thought-queue",
		workerConcurrency: config.workerConcurrency ?? 5,
	});

	const queueName = config.queueName ?? "thought-queue";

	const queue = new Queue<ThoughtJobData>(queueName, {
		connection: config.connection,
		defaultJobOptions: {
			attempts: 0,
			backoff: {
				type: "exponential",
				delay: 1000,
			},
			// removeOnComplete: true, // Clean up completed jobs
			// removeOnFail: true, // Clean up failed jobs
		},
	});

	const worker = new Worker<ThoughtJobData>(queueName, processThoughtJob, {
		connection: config.connection,
		concurrency: config.workerConcurrency ?? 1,
	});

	// Add connection status logging
	worker.on("ready", () => {
		logger.info("Thought scheduler worker is ready");
	});

	worker.on("error", (error) => {
		logger.error("Thought scheduler worker error", { error: error.message });
	});

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
		});
	});

	worker.on("drained", () => {
		logger.info("Thought scheduler worker has processed all jobs");
	});

	return {
		/**
		 * Creates or updates a thought scheduler
		 * @param schedulerId - Unique identifier for the scheduler
		 * @param repeatOptions - When and how often to generate thoughts
		 * @param jobTemplate - Template for generating thoughts including cat and thought type
		 * @returns The created/updated job
		 */
		upsertScheduler: async (schedulerId, repeatOptions, jobTemplate) => {
			logger.debug({
				msg: `Attempting to upsert scheduler ${schedulerId}`,
				schedulerId,
				repeatOptions: {
					pattern: repeatOptions.pattern,
					every: repeatOptions.every,
					startDate: repeatOptions.startDate,
					endDate: repeatOptions.endDate,
				},
				template: jobTemplate,
				timestamp: new Date().toISOString(),
			});

			// Validate repeat options
			if (!repeatOptions.pattern && !repeatOptions.every) {
				throw new Error(
					"Either pattern or every must be specified in repeat options",
				);
			}

			const job = await queue.upsertJobScheduler(
				schedulerId,
				{
					pattern: repeatOptions.pattern,
					every: repeatOptions.every,
					startDate: repeatOptions.startDate,
					endDate: repeatOptions.endDate,
				},
				{
					name: `thought-${jobTemplate.catId}`,
					data: {
						catId: jobTemplate.catId,
					},
				},
			);

			logger.debug({
				msg: `Successfully upserted scheduler ${schedulerId}`,
				schedulerId,
				jobId: job.id,
				nextRun: job.opts.repeat ? "Has repeat pattern" : "No repeat pattern",
				timestamp: new Date().toISOString(),
			});

			return job;
		},

		/**
		 * Removes a thought scheduler
		 * @param schedulerId - ID of the scheduler to remove
		 * @returns true if scheduler was removed, false otherwise
		 */
		removeScheduler: async (schedulerId: string) => {
			logger.info(`Removing scheduler ${schedulerId}`);
			return await queue.removeJobScheduler(schedulerId);
		},

		/**
		 * Retrieves a list of active thought schedulers
		 * @param start - Starting index for pagination
		 * @param end - Ending index for pagination
		 * @param asc - Sort order (ascending if true)
		 * @returns Array of scheduler information
		 */
		getSchedulers: async (start = 0, end = 10, asc = true) => {
			logger.info("Fetching job schedulers", { start, end, asc });
			const schedulers = await queue.getJobSchedulers(start, end, asc);
			return schedulers.map((scheduler) => ({
				...scheduler,
				tz: scheduler.tz ?? null,
				pattern: scheduler.pattern ?? null,
				every: scheduler.every ?? null,
				endDate: scheduler.endDate ?? null,
			}));
		},

		/**
		 * Closes the scheduler service and its worker
		 */
		close: async () => {
			logger.info("Closing thought scheduler service...");
			await worker.close();
			await queue.close();
			logger.info("Thought scheduler service closed");
		},
		queue,
	};
}
