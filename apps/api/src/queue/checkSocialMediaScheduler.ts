import { env } from "@/env";
import { logger } from "@/logger";
import { createRepliesPrompt } from "@/routes/catAgent/prompts/prompts";
import { LiteralClient } from "@literalai/client";
import type { ConnectionOptions, Job, RepeatableJob } from "bullmq";
import { Queue, Worker } from "bullmq";
import { executeStepWithTools } from "cat-ai";
import { createInstagramClient } from "cat-instagram";
import type { CatId } from "cat-sdk";
import { replyToComments } from "cat-tools";
// Define job data type
export interface CheckSocialMediaJobData {
	catId: string;
}

// At the top of the file, add these configurations
export const CHECK_SOCIAL_MEDIA_CONFIG = {
	NORMAL: { every: 1000 * 60 * 15 }, // Every 15 minutes
	CUSTOM: (minutes: number) => ({ every: 1000 * 60 * minutes }),
	CRON: (pattern: string) => ({ pattern }),
} as const;

// Add type for frequency config
export type CheckSocialMediaFrequencyConfig = typeof CHECK_SOCIAL_MEDIA_CONFIG;
export type CheckSocialMediaFrequencyPreset = keyof Omit<
	CheckSocialMediaFrequencyConfig,
	"CUSTOM" | "CRON"
>;

export interface CheckSocialMediaRepeatOptions {
	pattern?: string; // Cron pattern
	every?: number; // Milliseconds interval
	startDate?: Date | number; // Optional start date
	endDate?: Date | number;
}

async function processCheckSocialMediaJob(job: Job<CheckSocialMediaJobData>) {
	logger.debug({
		msg: `Starting to process thought job ${job.id}`,
		jobId: job.id,
		catId: job.data.catId,
		timestamp: new Date().toISOString(),
	});

	try {
		const client = createInstagramClient({
			username: env.IG_USERNAME,
			password: env.IG_PASSWORD,
		});
		const literalClient = new LiteralClient({
			apiKey: env.ANTHROPIC_API_KEY,
		});

		const posts = await client.getUserPosts(env.IG_USERNAME);
		const latestPost = posts[0];
		if (latestPost.comment_count > 0) {
			const postComments = await client.getPostComments(latestPost.id);
			if (postComments.length > 0) {
				const randomUnlikedComments = postComments
					.filter((comment) => !comment.has_liked_comment)
					.sort(() => 0.3 - Math.random())
					.slice(0, 3);

				const comments = randomUnlikedComments.map((comment) => {
					return {
						mediaId: comment.media_id,
						commentId: comment.pk as string,
						comment: comment.text,
					};
				});

				const configuredReplyToComments = replyToComments({
					client: client,
				});

				await executeStepWithTools({
					input: "Follow the system prompt and reply to the given comments",
					system: createRepliesPrompt(comments),
					logger: logger,
					tools: {
						replyToComments: configuredReplyToComments,
					},
					stepId: "reply-to-comments",
					stepName: "Reply to comments",
					providerConfig: {
						apikey: env.ANTHROPIC_API_KEY,
						modelId: "claude-3-5-sonnet-20240620",
						provider: "anthropic",
					},
					literalClient: literalClient,
				});
			}
		}
	} catch (error) {
		logger.error({
			msg: `Check social media job ${job.id} failed`,
			jobId: job.id,
			error: error instanceof Error ? error.message : "Unknown error",
		});
	}
}

export type CheckSocialMediaService = {
	queue: Queue<CheckSocialMediaJobData>;
	upsertScheduler: (
		schedulerId: string,
		repeatOptions: CheckSocialMediaRepeatOptions,
		jobTemplate: {
			catId: CatId;
		},
	) => Promise<Job<CheckSocialMediaJobData>>;
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
export interface CheckSocialMediaConfig {
	connection: ConnectionOptions;
	queueName?: string;
	workerConcurrency?: number;
}

/**
 * Creates a social media check scheduler service for managing autonomously replying to social media comments
 * @param config - Configuration options for the scheduler service
 * @returns CheckSocialMediaService instance with methods to manage thought scheduling
 */
export function createSocialMediaCheckSchedulerService(
	config: CheckSocialMediaConfig,
): CheckSocialMediaService {
	logger.info("Initializing social media check scheduler service...", {
		queueName: config.queueName ?? "check-social-media-queue",
		workerConcurrency: config.workerConcurrency ?? 5,
	});

	const queueName = config.queueName ?? "check-social-media-queue";

	const queue = new Queue<CheckSocialMediaJobData>(queueName, {
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

	const worker = new Worker<CheckSocialMediaJobData>(
		queueName,
		processCheckSocialMediaJob,
		{
			connection: config.connection,
			concurrency: config.workerConcurrency ?? 5,
		},
	);

	// Add connection to start logging
	worker.on("ready", () => {
		logger.info("Social media check scheduler worker is ready");
	});

	worker.on("error", (error) => {
		logger.error("Social media check scheduler worker error", {
			error: error.message,
		});
	});

	worker.on("failed", (job, error) => {
		logger.error(`Job ${job?.id} failed`, {
			jobId: job?.id,
			error: error.message,
		});
	});

	worker.on("completed", (job) => {
		logger.info(`Job ${job.id} completed successfully`, {
			jobId: job.id,
			catId: job.data.catId,
		});
	});

	worker.on("drained", () => {
		logger.info("Social media check scheduler worker has processed all jobs");
	});

	return {
		/**
		 * Creates or updates a social media check scheduler
		 * @param schedulerId - Unique identifier for the scheduler
		 * @param repeatOptions - When and how often to generate checks
		 * @param jobTemplate - Template for checking and replying to social media comments
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
					name: `check-social-media-${jobTemplate.catId}`,
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
		 * Removes a social media check scheduler
		 * @param schedulerId - ID of the scheduler to remove
		 * @returns true if scheduler was removed, false otherwise
		 */
		removeScheduler: async (schedulerId: string) => {
			logger.info(`Removing scheduler ${schedulerId}`);
			return await queue.removeJobScheduler(schedulerId);
		},

		/**
		 * Retrieves a list of active social media check schedulers
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
			logger.info("Closing social media check scheduler service...");
			await worker.close();
			await queue.close();
			logger.info("Social media check scheduler service closed");
		},
		queue,
	};
}
