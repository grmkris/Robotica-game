import { getDb } from "@/db/db";
import { env } from "@/env";
import { Queue } from "bullmq";

let queueServices: {
	interactionQueue: Queue;
	thoughtQueue: Queue;
	// Add any robot battle specific queues here if needed
} | null = null;

export async function initializeQueueServices() {
	if (queueServices) {
		return queueServices;
	}

	const services = {
		interactionQueue: new Queue("interaction", {
			connection: {
				host: env.REDIS_HOST,
				port: env.REDIS_PORT,
				password: env.REDIS_PASSWORD,
			},
		}),
		thoughtQueue: new Queue("thought", {
			connection: {
				host: env.REDIS_HOST,
				port: env.REDIS_PORT,
				password: env.REDIS_PASSWORD,
			},
		}),
	};

	// Initialize queue services without cat-specific logic
	if (env.ENABLE_THOUGHT_SCHEDULER || env.ENABLE_SOCIAL_MEDIA_SCHEDULER) {
		const db = getDb();
		// Remove cat-specific queries
		// Add any robot battle specific initialization here if needed
	}

	queueServices = services;
	return services;
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
		await Promise.all([
			queueServices.interactionQueue.close(),
			queueServices.thoughtQueue.close(),
		]);
	}
}

export type QueueServices = Awaited<ReturnType<typeof initializeQueueServices>>;
