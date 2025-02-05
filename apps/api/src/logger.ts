import { env } from "@/env";
import { createLogger } from "cat-logger";

export const logger = createLogger({
	level: env.LOG_LEVEL,
	name: "api",
});
