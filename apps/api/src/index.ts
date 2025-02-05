import { createCatApi } from "@/catApi";
import { getDb, getPgClient } from "@/db/db";
import { logger } from "@/logger";
import {
	closeQueueServices,
	getQueues,
	initializeQueueServices,
} from "@/queue/queueSingleton";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { HonoAdapter } from "@bull-board/hono";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { Hono } from "hono";
import { serveStatic } from "hono/bun";

// Create Hono app

// Initialize queue service and bull-board at startup
const initApp = async () => {
	logger.info("Migrating database...");
	await migrate(getDb(), { migrationsFolder: "drizzle" });
	logger.info("Database migrated successfully");

	logger.info("Initializing queue services...");
	await initializeQueueServices();
	logger.info("Queue services initialized successfully");

	logger.info("Initializing Cat API...");
	const catApi = await createCatApi({ logger });
	logger.info("Cat API initialized successfully");

	logger.info("Initializing Bull Board...");
	const serverAdapter = new HonoAdapter(serveStatic);

	const bullBoardQueues: BullMQAdapter[] = [];
	// Get your queues from queueSingleton
	const queues = getQueues();
	if (queues.interactionQueue) {
		bullBoardQueues.push(new BullMQAdapter(queues.interactionQueue.queue));
	}

	// Only add enabled schedulers to Bull Board
	if (queues.thoughtScheduler) {
		bullBoardQueues.push(new BullMQAdapter(queues.thoughtScheduler.queue));
	}
	if (queues.socialMediaChecker) {
		bullBoardQueues.push(new BullMQAdapter(queues.socialMediaChecker.queue));
	}

	createBullBoard({
		queues: bullBoardQueues,
		serverAdapter,
	});
	logger.info("Bull Board initialized successfully");
	const basePath = "/queues";
	serverAdapter.setBasePath(basePath);

	const app = new Hono()
		.route(basePath, serverAdapter.registerPlugin())
		.route("/", catApi);

	logger.info(`Bull Board UI available at http://localhost:3000${basePath}`);
	logger.info("App initialized successfully");
	return app;
};

export const catApp = await initApp();

// Handle graceful shutdown
const shutdown = async () => {
	logger.info("Shutting down...");
	await closeQueueServices();

	const pgClient = getPgClient();
	if (pgClient) {
		await pgClient.end();
	}

	process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

export default {
	port: 3000,
	fetch: catApp.fetch,
};
