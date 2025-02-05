import type { CatAPI } from "@/api";

import { CAT_SERVICE_URLS, Environment } from "cat-sdk";
import { hc } from "hono/client";

const environment = Environment.parse(process.env.NEXT_PUBLIC_ENVIRONMENT);

export const apiClient = hc<CatAPI>(CAT_SERVICE_URLS[environment].api, {
  init: {
    credentials: "include",
    mode: "cors",
    headers: {
      "Content-Type": "application/json",
    },
  },
});

export type ApiClient = typeof apiClient;
