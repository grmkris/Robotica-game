import { seedData } from "@/db/db";
import { env } from "@/env";
import { authApp } from "@/routes/auth/authRoute";
import { catAgentApp } from "@/routes/catAgent/catAgentRoute";
import { OpenAPIHono } from "@hono/zod-openapi";
import { apiReference } from "@scalar/hono-api-reference";
import type { Logger } from "cat-logger";
import { CAT_SERVICE_URLS } from "cat-sdk";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";
import { authMiddleware } from "./authMiddleware";

export const createCatApi = async (props: {
	logger: Logger;
}) => {
	const logger = props.logger;

	logger.info("Creating Cat API...");
	logger.info("Seeding data...");
	try {
		await seedData({ logger });
		logger.info("Database seeded successfully");
	} catch (error) {
		logger.error("Error seeding database:", error);
	}

	const catApi = new OpenAPIHono()
		.doc31("/swagger", {
			openapi: "3.1.0",
			info: { title: "Cat AI", version: "1.0.0" },
		})
		.use(requestId())
		.get(
			"/",
			apiReference({
				spec: {
					url: "/swagger",
				},
			}),
		)
		.use(
			cors({
				credentials: true,
				origin: CAT_SERVICE_URLS[env.ENVIRONMENT].frontend,
			}),
		)
		.use(authMiddleware)
		.route("/auth", authApp)
		.route("/cat-agent", catAgentApp);

	return catApi;
};

export type CatAPI = Awaited<ReturnType<typeof createCatApi>>;
