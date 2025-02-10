import { hc } from "hono/client";
import type { RobotAPI } from "../api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const customFetch = (input: RequestInfo | URL, init?: RequestInit) => {
  return fetch(input, {
    ...init,
    credentials: "include",
    headers: {
      ...init?.headers,
      "Content-Type": "application/json",
    },
  });
};

const client = hc<RobotAPI>(API_URL, {
  fetch: customFetch,
});

type ClientEndpoint<T> = NonNullable<(typeof client)[keyof typeof client]>;
type PostEndpoint = ClientEndpoint<RobotAPI> & {
  $post: (args: { json?: unknown }) => Promise<Response>;
};
type GetEndpoint = ClientEndpoint<RobotAPI> & {
  $get: (args?: { query?: Record<string, unknown> }) => Promise<Response>;
};
type PutEndpoint = ClientEndpoint<RobotAPI> & {
  $put: (args: { json?: unknown }) => Promise<Response>;
};

// Export the ApiClient type
export type ApiClient = typeof apiClient;

// Type-safe wrapper for client endpoints
export const apiClient = {
  createRobot: (prompt: string) => {
    const endpoint = client["/robot-battle/create-robot"] as PostEndpoint;
    if (!endpoint) throw new Error("Endpoint not found");
    return endpoint.$post({ json: { prompt } });
  },

  // Add new robot battle endpoints
  robotBattle: {
    getUserRobots: () => {
      const endpoint = client["/robot-battle/user-robots"] as GetEndpoint;
      if (!endpoint) throw new Error("Endpoint not found");
      return endpoint.$get();
    },
    selectActiveRobot: (robotId: string) => {
      const endpoint = client["/robot-battle/select-robot"] as PostEndpoint;
      if (!endpoint) throw new Error("Endpoint not found");
      return endpoint.$post({ json: { robotId } });
    },
    listRooms: () =>
      fetch(`${API_URL}/robot-battle/list`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      }),
    createRoom: (robotId: string) =>
      fetch(`${API_URL}/robot-battle/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ robotId }),
        credentials: "include",
      }),
    joinRoom: ({ roomId, robotId }: { roomId: string; robotId: string }) =>
      fetch(`${API_URL}/robot-battle/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ roomId, robotId }),
        credentials: "include",
      }),
    getRoomEvents: (roomId: string) => {
      const eventSource = new EventSource(
        `${API_URL}/robot-battle/events/${roomId}`,
      );
      return eventSource;
    },
    getBattleStatus: (battleId: string) =>
      fetch(`${API_URL}/robot-battle/battle-status?battleId=${battleId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      }),
  },

  auth: {
    me: () => {
      const endpoint = client["/auth/me"] as GetEndpoint;
      if (!endpoint) throw new Error("Endpoint not found");
      return endpoint.$get();
    },
    updateMe: (data: { username?: string }) => {
      const endpoint = client["/auth/me"] as PutEndpoint;
      if (!endpoint) throw new Error("Endpoint not found");
      return endpoint.$put({ json: data });
    },
    siwe: {
      nonce: {
        $get: async () => {
          const endpoint = client["/auth/siwe/nonce"] as GetEndpoint;
          if (!endpoint) throw new Error("Endpoint not found");
          return endpoint.$get();
        },
      },
      verify: {
        $post: async ({
          json,
        }: {
          json: { message: string; signature: string };
        }) => {
          const endpoint = client["/auth/siwe/verify"] as PostEndpoint;
          if (!endpoint) throw new Error("Endpoint not found");
          return endpoint.$post({ json });
        },
      },
    },
    connect: (walletAddress: string, signature: string) => {
      const endpoint = client["/auth/connect"] as PostEndpoint;
      if (!endpoint) throw new Error("Endpoint not found");
      return endpoint.$post({ json: { walletAddress, signature } });
    },
    disconnect: () => {
      const endpoint = client["/auth/disconnect"] as PostEndpoint;
      if (!endpoint) throw new Error("Endpoint not found");
      return endpoint.$post({});
    },
    logout: {
      $get: async ({ query }: { query: { redirect: boolean } }) => {
        const endpoint = client["/auth/logout"] as GetEndpoint;
        if (!endpoint) throw new Error("Endpoint not found");
        return endpoint.$get({ query });
      },
    },
    changePassword: (data: {
      currentPassword: string;
      newPassword: string;
    }) => {
      const endpoint = client["/auth/change-password"] as PostEndpoint;
      if (!endpoint) throw new Error("Endpoint not found");
      return endpoint.$post({ json: data });
    },
  },
};

// Add type definitions
declare module "@/lib/apiClient" {
  interface RobotBattleAPI {
    listRooms(): Promise<Response>;
    createRoom(robotId: string): Promise<Response>;
    joinRoom(params: { roomId: string; robotId: string }): Promise<Response>;
    getRoomEvents(roomId: string): EventSource;
  }
}
