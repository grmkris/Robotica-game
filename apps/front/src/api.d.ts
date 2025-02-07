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
    }
  >
>;

export type RobotAPI = Awaited<ReturnType<typeof createRobotApi>>;
