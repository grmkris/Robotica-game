import type { db } from "@/db/db";
import {
  BattleRoundsTable,
  BattleTable,
  RobotTable,
  UserBattleStatsTable,
} from "@/db/schema/robotBattle.db";
import { env } from "@/env";
import { validateUser } from "@/routes/helpers";
import type { ContextVariables } from "@/types";
import type { Robot, RoundDamageResult } from "@/types/robotBattle.types";
import { BATTLE_STATUS } from "@/types/robotBattle.types";
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { LiteralClient } from "@literalai/client";
import { executeStepStructured } from "cat-ai";
import type { Logger } from "cat-logger";
import { createMediaGenClient } from "cat-media-gen";
import { and, desc, eq, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { BattleId, RobotId, type UserId, generateId } from "robot-sdk";
import { battleRoomRoutes } from "../battleRoom.routes";

const determineBattleWinner = () => {
  // TODO: Implement this
  throw new Error("Not implemented");
}

const handleBattleError = () => {
  // TODO: Implement this
  throw new Error("Not implemented");
}

const updateBattleResults = () => {
  // TODO: Implement this
  throw new Error("Not implemented");
}

// Define Zod schemas for validation
const RobotIdSchema = RobotId;
const BattleIdSchema = BattleId;

// Add to the top of the file with other env variables
const mediaGen = createMediaGenClient({ falApiKey: env.FAL_API_KEY });

// Add schemas for robot generation and battle simulation
const RobotGenerationSchema = z.object({
  name: z.string(),
  description: z.string(),
  capabilities: z.array(z.string()),
  weaknesses: z.array(z.string()),
});

export const ROBOT_TYPES = ["mobility", "weapons", "structural", "power"] as const;
export const RobotType = z.enum(ROBOT_TYPES);
export type RobotType = z.infer<typeof RobotType>;
const BattleRoundSchema = z.object({
  description: z.string(),
  winner: RobotId, // ID of the robot that won the round
  tacticalAnalysis: z.string(),
  inflictedDamage: z.object({
    robot1: z.array(z.object({
      type: RobotType,
      severity: z.number(),
      description: z.string(),
    })),
    robot2: z.array(z.object({
      type: RobotType,
      severity: z.number(),
      description: z.string(),
    })),
  }),
});

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
              id: RobotIdSchema,
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

// Start Battle Route
export const startBattleRoute = new OpenAPIHono<{
  Variables: ContextVariables;
}>().openapi(
  createRoute({
    method: "post",
    path: "start-battle",
    tags: ["RobotBattle"],
    summary: "Start a battle between two robots",
    request: {
      body: {
        content: {
          "application/json": {
            schema: z.object({
              robot1Id: RobotIdSchema,
              robot2Id: RobotIdSchema,
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
              battleId: BattleIdSchema,
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
          robot1Id: robot1Id,
          robot2Id: robot2Id,
          status: "IN_PROGRESS",
        })
        .returning();

      // Start battle simulation in background
      void simulateBattle(battle.id, robot1Id, robot2Id, db, logger);

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

// Get Battle Status Route
export const getBattleStatusRoute = new OpenAPIHono<{
  Variables: ContextVariables;
}>().openapi(
  createRoute({
    method: "get",
    path: "battle-status",
    tags: ["RobotBattle"],
    summary: "Get the current status of a battle",
    request: {
      query: z.object({
        battleId: BattleIdSchema,
      }),
    },
    responses: {
      200: {
        description: "Success",
        content: {
          "application/json": {
            schema: z.object({
              status: z.enum(BATTLE_STATUS),
              rounds: z.array(
                z.object({
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
    const { battleId } = c.req.valid("query");
    const db = c.get("db");

    const battle = await db.query.BattleTable.findFirst({
      where: eq(BattleTable.id, battleId as `bat_${string}`),
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

// Get User Robots Route
export const getUserRobotsRoute = new OpenAPIHono<{
  Variables: ContextVariables;
}>().openapi(
  createRoute({
    method: "get",
    path: "user-robots",
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
                  id: RobotIdSchema,
                  name: z.string(),
                  description: z.string(),
                  prompt: z.string(),
                  createdAt: z.string(),
                })
              ),
              selectedRobotId: RobotIdSchema.nullable(),
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

// Helper function to update user battle stats
async function updateUserBattleStats(
  db: db,
  robot1: Robot,
  robot2: Robot,
  winnerId: RobotId
) {
  const [winner, loser] =
    winnerId === robot1.id ? [robot1, robot2] : [robot2, robot1];

  await db.transaction(async (tx: db) => {
    // Update winner stats
    await tx
      .update(UserBattleStatsTable)
      .set({ wins: sql`wins + 1` })
      .where(eq(UserBattleStatsTable.userId, winner.createdBy as UserId));

    // Update loser stats
    await tx
      .update(UserBattleStatsTable)
      .set({ losses: sql`losses + 1` })
      .where(eq(UserBattleStatsTable.userId, loser.createdBy as UserId));
  });
}


// Select Robot Route
export const selectRobotRoute = new OpenAPIHono<{
  Variables: ContextVariables;
}>().openapi(
  createRoute({
    method: "post",
    path: "select-robot",
    tags: ["RobotBattle"],
    summary: "Select a robot as the user's active robot",
    request: {
      body: {
        content: {
          "application/json": {
            schema: z.object({
              robotId: RobotIdSchema,
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
              success: z.boolean(),
              selectedRobotId: RobotIdSchema,
            }),
          },
        },
      },
    },
  }),
  async (c) => {
    const user = validateUser(c);
    const { robotId } = c.req.valid("json");
    const db = c.get("db");

    // Verify the robot exists and belongs to the user
    const robot = await db.query.RobotTable.findFirst({
      where: and(
        eq(RobotTable.id, robotId as `rob_${string}`),
        eq(RobotTable.createdBy, user.id)
      ),
    });

    if (!robot) {
      throw new HTTPException(404, { message: "Robot not found" });
    }

    // Update or create user stats with selected robot
    await db
      .insert(UserBattleStatsTable)
      .values({
        userId: user.id as UserId,
        selectedRobotId: robotId as `rob_${string}`,
      })
      .onConflictDoUpdate({
        target: [UserBattleStatsTable.userId],
        set: {
          selectedRobotId: robotId as `rob_${string}`,
          updatedAt: new Date(),
        },
      });

    return c.json({
      success: true,
      selectedRobotId: robotId,
    });
  }
);

// Add new interfaces for damage tracking
interface DamageEffect extends RoundDamageResult {
  roundInflicted: number;
}

interface RobotDamageState {
  mobility: DamageEffect[];
  weapons: DamageEffect[];
  structural: DamageEffect[];
  power: DamageEffect[];
}

interface BattleContext {
  robot1Damage: RobotDamageState;
  robot2Damage: RobotDamageState;
  previousRoundSummary?: string;
}

interface BattleRoundResult {
  description: string;
  winner: "robot1" | "robot2";
  tacticalAnalysis: string;
  inflictedDamage: {
    robot1: RoundDamageResult[];
    robot2: RoundDamageResult[];
  };
}

// Update the simulateBattle function
export async function simulateBattle(
  battleId: BattleId,
  robot1Id: RobotId,
  robot2Id: RobotId,
  db: db,
  logger: Logger
) {
  try {
    const robot1 = await db.query.RobotTable.findFirst({
      where: eq(RobotTable.id, robot1Id),
    });
    const robot2 = await db.query.RobotTable.findFirst({
      where: eq(RobotTable.id, robot2Id),
    });

    if (!robot1 || !robot2) {
      throw new Error(`One or both robots not found: ${robot1Id}, ${robot2Id}`);
    }

    // Initialize battle context
    const battleContext: BattleContext = {
      robot1Damage: {
        mobility: [],
        weapons: [],
        structural: [],
        power: [],
      },
      robot2Damage: {
        mobility: [],
        weapons: [],
        structural: [],
        power: [],
      },
    };

    // Simulate 3 rounds
    for (let roundNumber = 1; roundNumber <= 3; roundNumber++) {
      const roundResult = await literalClient
        .run({
          input: {
            robot1,
            robot2,
            battleContext,
            roundNumber,
          },
          name: `Simulate Battle Round ${roundNumber}`,
          metadata: {
            battleId,
            roundNumber,
            operation: "battle_simulation",
          },
        })
        .wrap(async () => {
          return await executeStepStructured<typeof BattleRoundSchema>({
            stepName: `battle_round_${roundNumber}`,
            input: JSON.stringify({ robot1, robot2, battleContext }), // generate better prompt instead of JSON.stringify
            system: `You are simulating a battle between two robots. Consider their capabilities, 
                    current damage state, and previous round results to generate an engaging and 
                    tactically sound battle narrative.`,
            logger,
            providerConfig: {
              apikey: env.GOOGLE_GEMINI_API_KEY,
              modelId: "gemini-2.0-flash-exp",
              provider: "google",
            },
            literalClient,
            stepId: `battle_round_${roundNumber}`,
            output: {
              outputSchema: BattleRoundSchema,
              schemaDescription: "The battle round results",
              schemaName: "BattleRound",
              temperature: 0.7,
            },
          });
        });

      // each round should store in db its steps...
      // Update battle context with new damage
      // updateBattleContext(battleContext, roundResult, roundNumber);

      // Store round results in database
      await db.insert(BattleRoundsTable).values({
        battleId: battleId,
        roundNumber,
        description: roundResult.description,
        winner: roundResult.winner,
        tacticalAnalysis: roundResult.tacticalAnalysis,
        damageReport: roundResult.inflictedDamage,
      });
    }

    // Determine battle winner and update stats
    const battleWinner = determineBattleWinner(battleContext);
    await updateBattleResults(db, battleId, battleWinner, robot1, robot2);

  } catch (error) {
    logger.error("Battle simulation failed", { error });
    await handleBattleError(db, battleId, error);
    throw error;
  }
}


// Combine all routes
export const robotBattleApp = new OpenAPIHono<{ Variables: ContextVariables }>()
  .route("/", createRobotRoute)
  .route("/", startBattleRoute)
  .route("/", getBattleStatusRoute)
  .route("/", getUserRobotsRoute)
  .route("/", selectRobotRoute)
  .route("/", battleRoomRoutes);
