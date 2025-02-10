import { env } from "@/env";
import { authApp } from "@/routes/auth/authRoute";
import { robotBattleApp } from "@/routes/robotBattle/robotBattleRoute";
import { OpenAPIHono } from "@hono/zod-openapi";
import { apiReference } from "@scalar/hono-api-reference";
import type { Logger } from "cat-logger";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";
import { ROBOT_SERVICE_URLS } from "robot-sdk";
import { authMiddleware } from "./authMiddleware";

export const createRobotApi = async (props: { logger: Logger }) => {
	const logger = props.logger;

	logger.info("Creating Robot Battle API...");

	const robotApi = new OpenAPIHono()
		.doc31("/swagger", {
			openapi: "3.1.0",
			info: {
				title: "Robot Battle API",
				version: "1.0.0",
				description: "API for creating and battling robots",
			},
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
				origin: ROBOT_SERVICE_URLS[env.ENVIRONMENT].frontend,
			}),
		)
		.use(authMiddleware)
		.route("/auth", authApp)
		.route("/robot-battle", robotBattleApp);

	return robotApi;
};

export type RobotAPI = Awaited<ReturnType<typeof createRobotApi>>;
