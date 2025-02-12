import {
  BattleRobotsTable,
  BattleStatus,
  BattleTable,
  RobotTable,
  UserBattleStatsTable,
} from "@/db/schema/robotBattle.db";
import { env } from "@/env";
import { validateUser } from "@/routes/helpers";
import { resolveBattle } from "@/routes/robotBattle/robotBattler";
import type { ContextVariables } from "@/types";
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { LiteralClient } from "@literalai/client";
import { executeStepStructured } from "cat-ai";
import type { Logger } from "cat-logger";
import { createMediaGenClient } from "cat-media-gen";
import { and, desc, eq, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { BattleId, RobotId, RoundId, UserId, generateId } from "robot-sdk";
import { createRoboticaOnchain } from "robot-onchain";
import { createWalletClient, http, isAddress } from "viem";
import { mnemonicToAccount } from "viem/accounts";
import { avalanche } from "viem/chains";

// Add to the top of the file with other env variables
const mediaGen = createMediaGenClient({ falApiKey: env.FAL_API_KEY });

// Add schemas for robot generation and battle simulation
const RobotGenerationSchema = z.object({
  name: z.string(),
  description: z.string(),
  capabilities: z.array(z.string()),
  weaknesses: z.array(z.string()),
});

export const ROBOT_TYPES = [
  "mobility",
  "weapons",
  "structural",
  "power",
] as const;
export const RobotType = z.enum(ROBOT_TYPES);
export type RobotType = z.infer<typeof RobotType>;

// Create the LiteralAI client
const literalClient = new LiteralClient({
  apiKey: env.LITERAL_AI_API_KEY,
});

// Create Robot Route
export const createRobotRoute = new OpenAPIHono<{
  Variables: ContextVariables;
}>().openapi(
  createRoute({
    method: "post",
    path: "create-robot",
    tags: ["RobotBattle"],
    summary: "Create a new robot from prompt",
    request: {
      body: {
        content: {
          "application/json": {
            schema: z.object({
              prompt: z.string().min(1),
            }),
          },
        },
      },
    },
    responses: {
      200: {
        description: "Robot created successfully",
        content: {
          "application/json": {
            schema: z.object({
              id: RobotId,
              name: z.string(),
              description: z.string(),
              prompt: z.string(),
            }),
          },
        },
      },
    },
  }),
  async (c) => {
    const { prompt } = c.req.valid("json");
    const user = validateUser(c);
    const db = c.get("db");
    const logger = c.get("logger");

    try {
      logger.info("Creating robot with prompt:", prompt);

      // Generate robot characteristics first
      const robotData = await generateRobotData(prompt, logger);
      let imageUrl: string;

      try {
        imageUrl = await generateRobotImage(robotData, logger);
      } catch (imageError) {
        logger.error("Failed to generate robot image:", imageError);
        imageUrl = `https://robohash.org/${robotData.name}`; // Use robohash as fallback
      }

      const robotId = generateId("robot");
      const [robot] = await db
        .insert(RobotTable)
        .values({
          id: robotId,
          name: robotData.name,
          description: robotData.description,
          prompt,
          imageUrl,
          createdBy: user.id,
          createdAt: new Date(),
        })
        .returning();

      logger.info("Created robot:", robot);
      return c.json(robot);
    } catch (error) {
      logger.error("Failed to create robot:", error);
      if (error instanceof Error) {
        throw new HTTPException(500, { message: error.message });
      }
      throw new HTTPException(500, { message: "Failed to create robot" });
    }
  }
);

// Helper function to generate robot data
async function generateRobotData(prompt: string, logger: Logger) {
  return await literalClient
    .run({
      input: {
        prompt,
      },
      name: "Generate Robot Design",
      metadata: {
        operation: "robot_generation",
      },
    })
    .wrap(async () => {
      return await executeStepStructured<typeof RobotGenerationSchema>({
        stepName: "robot_generation",
        input: prompt,
        system: `You are a robot designer. Create a unique and creative robot based on the user's prompt.
                Focus on describing its unique characteristics, abilities, strengths, and potential weaknesses.`,
        logger,
        providerConfig: {
          apikey: env.GOOGLE_GEMINI_API_KEY,
          modelId: "gemini-2.0-flash-exp",
          provider: "google",
        },
        literalClient,
        stepId: "robot_generation",
        output: {
          outputSchema: RobotGenerationSchema,
          schemaDescription: "The generated robot design",
          schemaName: "RobotGeneration",
          temperature: 0.8,
        },
      });
    });
}

// Helper function to generate robot image
async function generateRobotImage(
  robotData: { name: string; description: string },
  logger: Logger
): Promise<string> {
  try {
    const prompt = `Detailed technical illustration of a robot named ${robotData.name}. ${robotData.description}. Video game style, detailed mechanical parts, professional lighting, high quality render, 8k resolution, unreal engine style`;

    logger.info("Attempting to generate image with prompt:", prompt);

    const result = await mediaGen.generateImages({
      prompt,
      imageSize: "square_hd",
      numImages: 1,
    });

    if (!result.length || !result[0].imageUrl) {
      throw new Error("No image URL in generation response");
    }

    const imageUrl = result[0].imageUrl;
    logger.info("Generated robot image:", imageUrl);
    return imageUrl;
  } catch (error) {
    // Log detailed error information
    logger.error("Robot image generation failed:", {
      error:
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : error,
      robotName: robotData.name,
      robotDescription: robotData.description,
    });

    // Re-throw to be handled by the caller
    throw error;
  }
}

// Update route definitions to match new patterns
export const getBattleByIdRoute = new OpenAPIHono<{
  Variables: ContextVariables;
}>().openapi(
  createRoute({
    method: "get",
    path: ":battleId",
    tags: ["RobotBattle"],
    summary: "Get a battle by its id",
    request: {
      params: z.object({
        battleId: BattleId,
      }),
    },
    responses: {
      200: {
        description: "Success",
        content: {
          "application/json": {
            schema: z.object({
              id: BattleId,
              status: BattleStatus,
              winnerId: RobotId.nullable(),
              startedAt: z.coerce.date(),
              completedAt: z.coerce.date().nullable(),
              createdAt: z.coerce.date(),
              createdBy: UserId,
              rounds: z.array(
                z.object({
                  id: RoundId,
                  winnerId: RobotId.nullable(),
                  tacticalAnalysis: z.string(),
                  roundNumber: z.number(),
                  description: z.string(),
                })
              ),
            }),
          },
        },
      },
    },
  }),
  async (c) => {
    const { battleId } = c.req.valid("param");
    const db = c.get("db");

    const battle = await db.query.BattleTable.findFirst({
      where: eq(BattleTable.id, battleId),
      with: {
        rounds: true,
      },
    });

    if (!battle) {
      throw new HTTPException(404, { message: "Battle not found" });
    }

    return c.json(battle);
  }
);

export const getUserRobotsRoute = new OpenAPIHono<{
  Variables: ContextVariables;
}>().openapi(
  createRoute({
    method: "get",
    path: "/", // Updated from user-robots
    tags: ["RobotBattle"],
    summary: "Get all robots created by the user",
    responses: {
      200: {
        description: "Success",
        content: {
          "application/json": {
            schema: z.object({
              robots: z.array(
                z.object({
                  id: RobotId,
                  name: z.string(),
                  description: z.string(),
                  imageUrl: z.string().nullish(),
                  prompt: z.string(),
                  createdAt: z.string(),
                  createdBy: UserId,
                })
              ),
              selectedRobotId: RobotId.nullable(),
            }),
          },
        },
      },
    },
  }),
  async (c) => {
    const user = validateUser(c);
    const db = c.get("db");

    const robots = await db.query.RobotTable.findMany({
      where: eq(RobotTable.createdBy, user.id),
      orderBy: [desc(RobotTable.createdAt)],
    });

    const stats = await db.query.UserBattleStatsTable.findFirst({
      where: eq(UserBattleStatsTable.userId, user.id as UserId),
    });

    return c.json({
      robots,
      selectedRobotId: stats?.selectedRobotId ?? null,
    });
  }
);

export const battleEventsRoute = new OpenAPIHono<{
  Variables: ContextVariables;
}>().openapi(
  createRoute({
    method: "get",
    path: ":battleId/events",
    tags: ["RobotBattle"],
    summary: "Stream battle events in real-time",
    request: {
      params: z.object({
        battleId: BattleId,
      }),
    },
    responses: {
      200: {
        description: "SSE stream of battle events",
        content: {
          "text/event-stream": {
            schema: z.object({
              battle: z.object({
                id: BattleId,
                status: BattleStatus,
                rounds: z.array(
                  z.object({
                    id: RoundId,
                    roundWinnerId: RobotId,
                    tacticalAnalysis: z.string(),
                    roundNumber: z.number(),
                    description: z.string(),
                  })
                ),
              }),
            }),
          },
        },
      },
    },
  }),
  async (c) => {
    const battleId = c.req.param("battleId");
    const db = c.get("db");
    const logger = c.get("logger");

    logger.info("SSE connection established for battle:", battleId);

    // Helper function to encode SSE message
    const encoder = new TextEncoder();
    const encodeMessage = (data: unknown) => {
      return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
    };

    return new Response(
      new ReadableStream({
        async start(controller) {
          // Initial battle state
          const battle = await db.query.BattleTable.findFirst({
            where: eq(BattleTable.id, battleId as `bat_${string}`),
            with: {
              rounds: true,
            },
          });

          if (!battle) {
            logger.warn("Battle not found:", battleId);
            controller.close();
            return;
          }

          logger.info("Sending initial battle state:", battle);
          controller.enqueue(encodeMessage({ battle }));

          // Set up polling for updates
          const interval = setInterval(async () => {
            const updatedBattle = await db.query.BattleTable.findFirst({
              where: eq(BattleTable.id, battleId as `bat_${string}`),
              with: {
                rounds: true,
              },
            });

            if (!updatedBattle) {
              logger.warn("Battle no longer exists:", battleId);
              clearInterval(interval);
              controller.close();
              return;
            }

            logger.info("Sending battle update:", updatedBattle);
            controller.enqueue(encodeMessage({ battle: updatedBattle }));

            // Close stream if battle is complete
            if (updatedBattle.status === "COMPLETED") {
              logger.info("Battle completed, closing SSE connection");
              clearInterval(interval);
              controller.close();
            }
          }, 1000);

          // Clean up on disconnect
          c.req.raw.signal.addEventListener("abort", () => {
            logger.info("Client disconnected, cleaning up");
            clearInterval(interval);
            controller.close();
          });
        },
      }),
      {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      }
    );
  }
);

export const joinBattleRoute = new OpenAPIHono<{
  Variables: ContextVariables;
}>().openapi(
  createRoute({
    method: "post",
    path: ":battleId/join",
    tags: ["RobotBattle"],
    summary: "Join a battle",
    request: {
      params: z.object({
        battleId: BattleId,
      }),
      body: {
        content: {
          "application/json": {
            schema: z.object({
              robotId: RobotId,
            }),
          },
        },
      },
    },
    responses: {
      200: {
        description: "Successfully joined battle",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean(),
            }),
          },
        },
      },
    },
  }),
  async (c) => {
    const { battleId } = c.req.valid("param");
    const { robotId } = c.req.valid("json");
    const db = c.get("db");
    const logger = c.get("logger");

    const battle = await db.query.BattleTable.findFirst({
      where: eq(BattleTable.id, battleId),
      with: {
        battleRobots: true,
      },
    });

    if (!battle) {
      throw new HTTPException(404, { message: "Battle not found" });
    }

    if (battle.status !== "WAITING") {
      throw new HTTPException(400, {
        message: "Battle is not in WAITING status",
      });
    }

    // Insert battle robot
    await db.insert(BattleRobotsTable).values({
      id: generateId("battleRobot"),
      battleId,
      robotId: robotId,
    });

    // Update battle status to IN_PROGRESS after second robot joins
    await db
      .update(BattleTable)
      .set({ status: "IN_PROGRESS" })
      .where(eq(BattleTable.id, battleId));

    // Start battle simulation in background
    void resolveBattle({ battleId, db, logger });

    return c.json({ success: true });
  }
);

export const startBattleRoute = new OpenAPIHono<{
  Variables: ContextVariables;
}>().openapi(
  createRoute({
    method: "post",
    path: ":battleId/start",
    tags: ["RobotBattle"],
    summary: "Start a battle between two robots",
    request: {
      params: z.object({
        battleId: BattleId,
      }),
      body: {
        content: {
          "application/json": {
            schema: z.object({
              robot1Id: RobotId,
              robot2Id: RobotId,
            }),
          },
        },
      },
    },
    responses: {
      200: {
        description: "Success",
        content: {
          "application/json": {
            schema: z.object({
              battleId: BattleId,
            }),
          },
        },
      },
    },
  }),
  async (c) => {
    const { robot1Id, robot2Id } = c.req.valid("json");
    const db = c.get("db");
    const logger = c.get("logger");
    const user = validateUser(c);

    try {
      // Validate that both robots exist
      const robot1 = await db.query.RobotTable.findFirst({
        where: eq(RobotTable.id, robot1Id),
      });
      const robot2 = await db.query.RobotTable.findFirst({
        where: eq(RobotTable.id, robot2Id),
      });

      if (!robot1 || !robot2) {
        throw new HTTPException(404, {
          message: "One or both robots not found",
        });
      }

      const battleId = generateId("battle");

      const [battle] = await db
        .insert(BattleTable)
        .values({
          id: battleId,
          status: "IN_PROGRESS",
          createdBy: user.id,
        })
        .returning();

      // Insert battle robots
      await db.insert(BattleRobotsTable).values([
        { id: generateId("battleRobot"), battleId, robotId: robot1Id },
        { id: generateId("battleRobot"), battleId, robotId: robot2Id },
      ]);

      // Start battle simulation in background
      void resolveBattle({ battleId, db, logger });

      return c.json({ battleId: battle.id });
    } catch (error) {
      logger.error("Failed to start battle", { error });
      if (error instanceof HTTPException) {
        throw error;
      }
      throw new HTTPException(500, { message: "Failed to start battle" });
    }
  }
);

export const createBattleRoute = new OpenAPIHono<{
  Variables: ContextVariables;
}>().openapi(
  createRoute({
    method: "post",
    path: "create-battle",
    tags: ["RobotBattle"],
    summary: "Create a new battle",
    request: {
      body: {
        content: {
          "application/json": {
            schema: z.object({
              robot1Id: RobotId,
            }),
          },
        },
      },
    },
    responses: {
      200: {
        description: "Battle created successfully",
        content: {
          "application/json": {
            schema: z.object({
              battleId: BattleId,
            }),
          },
        },
      },
    },
  }),
  async (c) => {
    const body = await c.req.json();
    const { robot1Id } = body;
    const user = validateUser(c);
    const db = c.get("db");
    const logger = c.get("logger");

    try {
      // Validate that robot exists
      const robot1 = await db.query.RobotTable.findFirst({
        where: and(
          eq(RobotTable.id, robot1Id),
          eq(RobotTable.createdBy, user.id)
        ),
      });

      if (!robot1) {
        throw new HTTPException(404, { message: "Robot not found" });
      }

      // Create battle with WAITING status instead of IN_PROGRESS
      const battleId = generateId("battle");
      const [battle] = await db
        .insert(BattleTable)
        .values({
          id: battleId,
          status: "WAITING", // Changed from IN_PROGRESS to WAITING
          createdBy: user.id,
        })
        .returning();

      // Insert battle robot
      await db.insert(BattleRobotsTable).values({
        id: generateId("battleRobot"),
        battleId,
        robotId: robot1Id,
      });

      return c.json({ battleId: battle.id });
    } catch (error) {
      logger.error({
        msg: "Failed to create battle",
        error,
      });
      if (error instanceof HTTPException) {
        throw error;
      }
      throw new HTTPException(500, { message: "Failed to create battle" });
    }
  }
);

const listBattlesRoute = new OpenAPIHono<{
  Variables: ContextVariables;
}>().openapi(
  createRoute({
    method: "get",
    path: "/",
    tags: ["RobotBattle"],
    summary: "List all battles with pagination",
    request: {
      query: z.object({
        page: z.string().optional().default("1"),
        limit: z.string().optional().default("10"),
      }),
    },
    responses: {
      200: {
        description: "List of battles",
        content: {
          "application/json": {
            schema: z.object({
              battles: z.array(
                z.object({
                  id: BattleId,
                  status: BattleStatus,
                  createdAt: z.coerce.date(),
                  createdBy: UserId,
                  completedAt: z.coerce.date().nullable(),
                  robots: z.array(
                    z.object({
                      id: RobotId,
                      name: z.string(),
                      imageUrl: z.string().nullish(),
                    })
                  ),
                })
              ),
              total: z.number(),
              page: z.number(),
              totalPages: z.number(),
            }),
          },
        },
      },
    },
  }),
  async (c) => {
    const { page, limit } = c.req.valid("query");
    const db = c.get("db");

    const pageNum = Number.parseInt(page);
    const limitNum = Number.parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // Get total count of battles
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(BattleTable);

    // Get battles with their robots
    const battles = await db.query.BattleTable.findMany({
      limit: limitNum,
      offset,
      orderBy: [desc(BattleTable.createdAt)],
      with: {
        battleRobots: {
          with: {
            robot: true,
          },
        },
      },
    });

    // Transform the data to match the response schema
    const formattedBattles = battles.map((battle) => ({
      id: battle.id,
      status: battle.status,
      createdAt: battle.createdAt,
      createdBy: battle.createdBy,
      completedAt: battle.completedAt,
      robots: battle.battleRobots.map((br) => ({
        id: br.robot.id,
        name: br.robot.name,
        imageUrl: br.robot.imageUrl,
      })),
    }));

    return c.json({
      battles: formattedBattles,
      total: Number(count),
      page: pageNum,
      totalPages: Math.ceil(Number(count) / limitNum),
    });
  }
);

// Add new routes for generating signatures
export const generateGameSignatureRoute = new OpenAPIHono<{
  Variables: ContextVariables;
}>().openapi(
  createRoute({
    method: "post",
    path: "/generate-game-signature",
    tags: ["RobotBattle"],
    summary: "Generate signature for entering a game",
    request: {
      body: {
        content: {
          "application/json": {
            schema: z.object({
              gameId: z.string(),
              userAddress: z.string(),
            }),
          },
        },
      },
    },
    responses: {
      200: {
        description: "Signature generated successfully",
        content: {
          "application/json": {
            schema: z.object({
              signature: z.string(),
            }),
          },
        },
      },
    },
  }),
  async (c) => {
    const { gameId, userAddress } = c.req.valid("json");
    const logger = c.get("logger");

    try {
      // Validate the userAddress
      if (!isAddress(userAddress)) {
        throw new HTTPException(400, { message: "Invalid Ethereum address" });
      }

      // Create wallet client with backend mnemonic
      const account = mnemonicToAccount(env.SIGNER_MNEMONIC);
      const walletClient = createWalletClient({
        account,
        transport: http(),
      });

      // Create Robotica contract instance
      const robotica = createRoboticaOnchain({
        walletClient,
        contractAddress: env.CONTRACT_ADDRESS as `0x${string}`,
        chain: avalanche,
      });

      // Generate signature
      const signature = await robotica.generateEnterGameSignature({
        user: userAddress as `0x${string}`,
        gameId: BigInt(gameId),
      });

      return c.json({ signature });
    } catch (error) {
      logger.error("Failed to generate game signature:", error);
      throw new HTTPException(500, {
        message: "Failed to generate game signature",
      });
    }
  }
);

export const generateClaimSignatureRoute = new OpenAPIHono<{
  Variables: ContextVariables;
}>().openapi(
  createRoute({
    method: "post",
    path: "/generate-claim-signature",
    tags: ["RobotBattle"],
    summary: "Generate signature for claiming a prize",
    request: {
      body: {
        content: {
          "application/json": {
            schema: z.object({
              gameId: z.string(),
              userAddress: z.string(),
              amount: z.string(),
            }),
          },
        },
      },
    },
    responses: {
      200: {
        description: "Signature generated successfully",
        content: {
          "application/json": {
            schema: z.object({
              signature: z.string(),
            }),
          },
        },
      },
    },
  }),
  async (c) => {
    const { gameId, userAddress, amount } = c.req.valid("json");
    const logger = c.get("logger");

    try {
      // Validate the userAddress
      if (!isAddress(userAddress)) {
        throw new HTTPException(400, { message: "Invalid Ethereum address" });
      }

      // Create wallet client with backend mnemonic
      const account = mnemonicToAccount(env.SIGNER_MNEMONIC);
      const walletClient = createWalletClient({
        account,
        transport: http(),
      });

      // Create Robotica contract instance
      const robotica = createRoboticaOnchain({
        walletClient,
        contractAddress: env.CONTRACT_ADDRESS as `0x${string}`,
        chain: avalanche,
      });

      // Generate signature
      const signature = await robotica.generateClaimPrizeSignature({
        user: userAddress as `0x${string}`,
        gameId: BigInt(gameId),
        amount: BigInt(amount),
      });

      return c.json({ signature });
    } catch (error) {
      logger.error("Failed to generate claim signature:", error);
      throw new HTTPException(500, {
        message: "Failed to generate claim signature",
      });
    }
  }
);

// Refactor routes with better RESTful patterns
export const robotBattleApp = new OpenAPIHono<{ Variables: ContextVariables }>()
  // Robots resource
  .route("/robots", createRobotRoute) // POST /robots
  .route("/robots", getUserRobotsRoute) // GET /robots

  // Battles resource
  .route("/battles", createBattleRoute) // POST /battles
  .route("/battles", getBattleByIdRoute) // GET /battles/:battleId
  .route("/battles", joinBattleRoute) // POST /battles/:battleId/join
  .route("/battles", startBattleRoute) // POST /battles/:battleId/start
  .route("/battles", battleEventsRoute) // GET /battles/:battleId/events
  .route("/battles", listBattlesRoute) // GET /battles
  .route("/generate-game-signature", generateGameSignatureRoute)
  .route("/generate-claim-signature", generateClaimSignatureRoute);
