import { z } from "zod";

export const ENVIRONMENTS = ["dev", "prod"] as const;

export const Environment = z.enum(ENVIRONMENTS);
export type Environment = z.infer<typeof Environment>;

export const ROBOT_SERVICE_URLS: Record<
  Environment,
  {
    api: string;
    frontend: string;
  }
> = {
  dev: {
    api: "http://localhost:3000",
    frontend: "http://localhost:3002",
  },
  prod: {
    api: "https://api.robotica.com", // Replace with your actual production URL
    frontend: "https://robotica.com", // Replace with your actual production URL
  },
} as const;
