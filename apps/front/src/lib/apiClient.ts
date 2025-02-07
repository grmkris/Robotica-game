import { hc } from "hono/client";
import type { RobotAPI } from "../api";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/robot-battle";

export const apiClient = hc<RobotAPI>(API_URL, {
  fetch: (input: RequestInfo | URL, init?: RequestInit) => {
    return fetch(input, {
      ...init,
      credentials: "include",
      headers: {
        ...init?.headers,
        "Content-Type": "application/json",
      },
    });
  },
});
