import { z } from "zod";

export const ENVIRONMENTS = ["dev", "prod"] as const;

export const Environment = z.enum(ENVIRONMENTS);
export type Environment = z.infer<typeof Environment>;

export const ROBOT_SERVICE_URLS: Record<
	Environment,
	{
		api: string;
		frontend: string;
		cookieDomain: string;
	}
> = {
	dev: {
		api: "http://localhost:3000",
		frontend: "http://localhost:3002",
		cookieDomain: "localhost",
	},
	prod: {
		api: "https://api.robotica.gg",
		frontend: "https://robotica.gg",
		cookieDomain: "robotica.gg",
	},
} as const;
