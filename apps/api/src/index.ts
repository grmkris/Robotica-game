import { getDb, getPgClient } from "@/db/db";
import { logger } from "@/logger";
import { createRobotApi } from "@/robotApi";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { Hono } from "hono";
import { robotBattleApp } from "./routes/robotBattle/robotBattleRoute";

// Create Hono app

// Initialize queue service and bull-board at startup
const initApp = async () => {
	logger.info("Migrating database...");
	await migrate(getDb(), { migrationsFolder: "drizzle" });
	logger.info("Database migrated successfully");

	logger.info("Initializing Robot Battle API...");
	const robotApi = await createRobotApi({ logger });
	logger.info("Robot Battle API initialized successfully");

	const app = new Hono().route("/", robotApi);

	app.route("/robotica", robotBattleApp);

	return app;
};

const app = await initApp();

// Handle graceful shutdown
const shutdown = async () => {
	logger.info("Shutting down...");

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
	fetch: app.fetch,
};
