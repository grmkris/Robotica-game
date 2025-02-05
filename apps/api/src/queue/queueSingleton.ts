import { getDb } from "@/db/db";
import { env } from "@/env";
import { logger } from "@/logger";
import { QUEUE_FREQUENCY_CONFIG } from "@/queue/queue.utils";
import {
	CHECK_SOCIAL_MEDIA_CONFIG,
	type CheckSocialMediaService,
	createSocialMediaCheckSchedulerService,
} from "./checkSocialMediaScheduler";
import {
	type InteractionQueueService,
	createInteractionQueueService,
} from "./interactionQueue";
import {
	type ThoughtSchedulerService,
	createThoughtSchedulerService,
} from "./thoughtScheduler";

export interface QueueServices {
	interactionQueue: InteractionQueueService;
	thoughtScheduler?: ThoughtSchedulerService;
	socialMediaChecker?: CheckSocialMediaService;
}

let queueServices: QueueServices | null = null;

export async function initializeQueueServices() {
	if (!queueServices) {
		logger.info("Initializing global queue services...");
		const connection = {
			host: env.REDIS_HOST,
			port: env.REDIS_PORT,
			password: env.REDIS_PASSWORD,
		};

		// Initialize base services
		const services: QueueServices = {
			interactionQueue: createInteractionQueueService({
				connection,
				workerConcurrency: 1,
				queueName: "interaction-queue",
			}),
		};

		// Conditionally initialize thought scheduler
		if (env.ENABLE_THOUGHT_SCHEDULER) {
			logger.info("Initializing thought scheduler...");
			services.thoughtScheduler = createThoughtSchedulerService({
				connection,
				queueName: "thought-queue",
				workerConcurrency: 1,
			});
		}

		// Conditionally initialize social media checker
		if (env.ENABLE_SOCIAL_MEDIA_SCHEDULER) {
			logger.info("Initializing social media checker...");
			services.socialMediaChecker = createSocialMediaCheckSchedulerService({
				connection,
				queueName: "check-social-media-queue",
				workerConcurrency: 1,
			});
		}

		queueServices = services;

		// Only set up schedulers if enabled
		if (env.ENABLE_THOUGHT_SCHEDULER || env.ENABLE_SOCIAL_MEDIA_SCHEDULER) {
			const db = getDb();
			const cats = await db.query.CatTable.findMany();
			logger.info("Setting up schedulers for cats", { catCount: cats.length });

			for (const cat of cats) {
				if (env.ENABLE_THOUGHT_SCHEDULER && services.thoughtScheduler) {
					await services.thoughtScheduler.upsertScheduler(
						cat.id,
						{
							every: QUEUE_FREQUENCY_CONFIG.CUSTOM(
								env.THOUGHT_SCHEDULER_FREQUENCY,
							).every,
						},
						{
							catId: cat.id,
						},
					);
				}

				if (env.ENABLE_SOCIAL_MEDIA_SCHEDULER && services.socialMediaChecker) {
					await services.socialMediaChecker.upsertScheduler(
						cat.id,
						{
							every: CHECK_SOCIAL_MEDIA_CONFIG.CUSTOM(
								env.SOCIAL_MEDIA_SCHEDULER_FREQUENCY,
							).every,
						},
						{
							catId: cat.id,
						},
					);
				}
			}
		}
	}
	return queueServices;
}

export function getQueueServices() {
	if (!queueServices) {
		throw new Error(
			"Queue services not initialized. Call initializeQueueServices first.",
		);
	}
	return queueServices;
}

export async function closeQueueServices() {
	if (queueServices) {
		const closePromises: Promise<void>[] = [
			queueServices.interactionQueue.close(),
		];

		if (queueServices.thoughtScheduler) {
			closePromises.push(queueServices.thoughtScheduler.close());
		}
		if (queueServices.socialMediaChecker) {
			closePromises.push(queueServices.socialMediaChecker.close());
		}

		await Promise.all(closePromises);
		queueServices = null;
	}
}

export function getQueues() {
	return {
		interactionQueue: queueServices?.interactionQueue,
		thoughtScheduler: queueServices?.thoughtScheduler,
		socialMediaChecker: queueServices?.socialMediaChecker,
	};
}
