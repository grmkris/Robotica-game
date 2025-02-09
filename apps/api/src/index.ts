import { createRobotApi } from "@/robotApi";
import { getDb, getPgClient } from "@/db/db";
import { logger } from "@/logger";
import {
  closeQueueServices,
  initializeQueueServices,
} from "@/queue/queueSingleton";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { Hono } from "hono";
import { battleRoomRoutes } from "./routes/battleRoom.routes";

// Create Hono app

// Initialize queue service and bull-board at startup
const initApp = async () => {
  logger.info("Migrating database...");
  await migrate(getDb(), { migrationsFolder: "drizzle" });
  logger.info("Database migrated successfully");

  // Initialize queue services
  logger.info("Initializing queue services...");
  await initializeQueueServices();
  logger.info("Queue services initialized successfully");

  logger.info("Initializing Robot Battle API...");
  const robotApi = await createRobotApi({ logger });
  logger.info("Robot Battle API initialized successfully");

  const app = new Hono().route("/", robotApi);

  app.route("/battle-room", battleRoomRoutes);

  return app;
};

const app = await initApp();

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
  fetch: app.fetch,
};
