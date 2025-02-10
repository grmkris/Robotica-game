import type { RobotAPI } from "@/api";

import { hc } from "hono/client";
import { Environment, ROBOT_SERVICE_URLS } from "robot-sdk";

const environment = Environment.parse(process.env.NEXT_PUBLIC_ENVIRONMENT);

export const robotClient = hc<RobotAPI>(ROBOT_SERVICE_URLS[environment].api, {
  init: {
    credentials: "include",
    mode: "cors",
    headers: {
      "Content-Type": "application/json",
    },
  },
});

export type RobotClient = typeof robotClient;
