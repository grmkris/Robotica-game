import type { Logger } from "cat-logger";

export declare const createRobotApi: (props: { logger: Logger }) => Promise<
  import("hono/hono-base").HonoBase<
    {
      Variables: import("./types").ContextVariables;
    },
    {
      "/create-robot": {
        $post: {
          input: {
            json: {
              prompt: string;
            };
          };
          output: {
            id: `rob_${string}`;
            name: string;
            description: string;
            prompt: string;
            createdBy: string;
            createdAt: string;
          };
          outputFormat: "json";
          status: 200;
        };
      };
      "/auth/me": {
        $get: {
          output: {
            id: string;
            username: string;
            email?: string;
            emailVerified: boolean;
          };
          outputFormat: "json";
          status: 200;
        };
      };
      "/auth/siwe/nonce": {
        $get: {
          output: {
            nonce: string;
          };
          outputFormat: "json";
          status: 200;
        };
      };
      "/auth/siwe/verify": {
        $post: {
          input: {
            json: {
              message: string;
              signature: string;
            };
          };
          output: {
            ok: boolean;
          };
          outputFormat: "json";
          status: 200;
        };
      };
      "/auth/connect": {
        $post: {
          input: {
            json: {
              walletAddress: string;
              signature: string;
            };
          };
          output: {
            ok: boolean;
          };
          outputFormat: "json";
          status: 200;
        };
      };
      "/auth/disconnect": {
        $post: {
          output: {
            ok: boolean;
          };
          outputFormat: "json";
          status: 200;
        };
      };
      "/robot-battle/user-robots": {
        get: {
          response: UserRobotsResponse;
        };
      };
      "/robot-battle/select-robot": {
        post: {
          input: {
            json: {
              robotId: string;
            };
          };
          response: {
            success: boolean;
          };
        };
      };
      "/robot-battle/create-robot": {
        post: {
          input: {
            json: {
              prompt: string;
            };
          };
          response: Robot;
        };
      };
    }
  >
>;

interface Robot {
  id: string;
  name: string;
  description: string;
  prompt: string;
  createdAt: string;
}

interface UserRobotsResponse {
  robots: Robot[];
  selectedRobotId: string | null;
}

export type RobotAPI = Awaited<ReturnType<typeof createRobotApi>>;
