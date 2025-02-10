import {
  RobotTable,
  BattleTable,
  BattleRoundsTable,
  UserBattleStatsTable,
} from "@/db/schema/robotBattle.db";
import { validateUser } from "@/routes/helpers";
import type { ContextVariables } from "@/types";
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { BATTLE_STATUS, generateId } from "@/types/robotBattle.types";
import { eq, desc, and } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { OpenAI } from "openai";
import { env } from "@/env";
import { sql } from "drizzle-orm";
import type { BattleRound } from "@/types/robotBattle.types";
import { battleRoomRoutes } from "../battleRoom.routes";
import type {
  RoundDamageResult,
  BattleDamageReport,
} from "@/types/robotBattle.types";
import { createMediaGenClient } from "cat-media-gen";

// Define Zod schemas for validation
const RobotIdSchema = z.string().regex(/^rob_[a-zA-Z0-9]+$/);
const BattleIdSchema = z.string().regex(/^bat_[a-zA-Z0-9]+$/);

// Add to the top of the file with other env variables
const mediaGen = createMediaGenClient({ falApiKey: env.FAL_API_KEY });

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
      const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

      // Generate robot characteristics first
      const robotData = await generateRobotData(openai, prompt, logger);
      let imageUrl: string;

      try {
        imageUrl = await generateRobotImage(robotData, logger);
      } catch (imageError) {
        logger.error("Failed to generate robot image:", imageError);
        imageUrl = "https://robohash.org/" + robotData.name; // Use robohash as fallback
      }

      const robotId = generateId("robot") as `rob_${string}`;
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
async function generateRobotData(openai: OpenAI, prompt: string, logger: any) {
  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: `You are a robot designer. Create a unique and creative robot based on the user's prompt.
                 Focus on describing its unique characteristics, abilities, strengths, and potential weaknesses.
                 Return a JSON object with:
                 {
                   "name": "Creative robot name",
                   "description": "Detailed description of the robot's capabilities, design, and tactical considerations"
                 }`,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const content = completion.choices[0].message.content;
  if (!content) {
    throw new Error("Failed to generate robot characteristics");
  }

  logger.info("OpenAI response:", content);
  return JSON.parse(content);
}

// Helper function to generate robot image
async function generateRobotImage(
  robotData: { name: string; description: string },
  logger: any
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
        where: eq(RobotTable.id, robot1Id as `rob_${string}`),
      });
      const robot2 = await db.query.RobotTable.findFirst({
        where: eq(RobotTable.id, robot2Id as `rob_${string}`),
      });

      if (!robot1 || !robot2) {
        throw new HTTPException(404, {
          message: "One or both robots not found",
        });
      }

      const battleId = generateId("battle") as `bat_${string}`;

      const [battle] = await db
        .insert(BattleTable)
        .values({
          id: battleId,
          robot1Id: robot1Id as `rob_${string}`,
          robot2Id: robot2Id as `rob_${string}`,
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
      where: eq(UserBattleStatsTable.userId, user.id),
    });

    return c.json({
      robots,
      selectedRobotId: stats?.selectedRobotId ?? null,
    });
  }
);

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
        userId: user.id,
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
  battleId: string,
  robot1Id: string,
  robot2Id: string,
  db: any,
  logger: any
) {
  try {
    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

    const robot1 = await db.query.RobotTable.findFirst({
      where: eq(RobotTable.id, robot1Id as `rob_${string}`),
    });
    const robot2 = await db.query.RobotTable.findFirst({
      where: eq(RobotTable.id, robot2Id as `rob_${string}`),
    });

    logger.info("Found robots for battle:", { robot1, robot2 });

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
      logger.info(`Starting round ${roundNumber}`);

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are an expert battle analyst and referee for intense robot battles. Your task is to create vivid, detailed battle narratives that take into account cumulative damage and tactical implications.

            Consider these key aspects:
            - Describe specific damage locations and their severity
            - Show how previous damage affects current performance
            - Detail tactical adaptations due to injuries
            - Include environmental interactions
            - Focus on realistic robot combat mechanics
            
            Return a JSON object with:
            {
              "description": "Detailed battle narrative with specific damage descriptions",
              "winner": "robot1 or robot2",
              "tacticalAnalysis": "Analysis of critical moments and strategic implications",
              "inflictedDamage": {
                "robot1": [
                  {
                    "type": "mobility|weapons|structural|power",
                    "location": "specific part affected",
                    "severity": "light|moderate|severe",
                    "description": "detailed damage description"
                  }
                ],
                "robot2": [
                    {
                    "type": "mobility|weapons|structural|power",
                    "location": "specific part affected",
                    "severity": "light|moderate|severe",
                    "description": "detailed damage description"
                  }
                ]
              }
            }`,
          },
          {
            role: "user",
            content: `Round ${roundNumber}:
              Robot 1: "${robot1.name}" - ${robot1.description}
              Current Damage: ${JSON.stringify(battleContext.robot1Damage)}

              Robot 2: "${robot2.name}" - ${robot2.description}
              Current Damage: ${JSON.stringify(battleContext.robot2Damage)}

              Previous Round Summary: ${battleContext.previousRoundSummary || "First round of battle"}
              
              Narrate this battle round considering previous damage and tactical implications.`,
          },
        ],
      });

      const content = completion.choices[0].message.content;
      if (!content) {
        throw new Error("Failed to generate round results");
      }

      try {
        const roundResult = JSON.parse(content) as BattleRoundResult;
        logger.info(`Round ${roundNumber} parsed result:`, roundResult);

        // Update battle context with new damage
        roundResult.inflictedDamage.robot1.forEach(
          (damage: RoundDamageResult) => {
            battleContext.robot1Damage[damage.type].push({
              ...damage,
              roundInflicted: roundNumber,
            });
          }
        );

        roundResult.inflictedDamage.robot2.forEach(
          (damage: RoundDamageResult) => {
            battleContext.robot2Damage[damage.type].push({
              ...damage,
              roundInflicted: roundNumber,
            });
          }
        );

        // Update previous round summary
        battleContext.previousRoundSummary = roundResult.description;

        const roundWinnerId =
          roundResult.winner === "robot1" ? robot1Id : robot2Id;

        // Save round results to database
        await db.insert(BattleRoundsTable).values({
          id: generateId("round"),
          battleId,
          roundNumber,
          description: roundResult.description,
          tacticalAnalysis: roundResult.tacticalAnalysis,
          robot1Action: `${robot1.name} engages in battle`,
          robot2Action: `${robot2.name} engages in battle`,
          roundWinnerId,
          damageReport: {
            robot1Damage: roundResult.inflictedDamage.robot1,
            robot2Damage: roundResult.inflictedDamage.robot2,
          } satisfies BattleDamageReport,
        });
      } catch (parseError) {
        logger.error("Failed to parse round result:", parseError, content);
        throw parseError;
      }
    }

    // Determine overall winner
    const rounds = await db.query.BattleRoundsTable.findMany({
      where: eq(BattleRoundsTable.battleId, battleId as `bat_${string}`),
    });

    const robot1Wins = rounds.filter(
      (r: BattleRound) => r.roundWinnerId === robot1Id
    ).length;

    const robot2Wins = rounds.filter(
      (r: BattleRound) => r.roundWinnerId === robot2Id
    ).length;

    const winnerId = robot1Wins > robot2Wins ? robot1Id : robot2Id;

    await db
      .update(BattleTable)
      .set({
        status: "COMPLETED",
        winnerId,
        completedAt: new Date(),
      })
      .where(eq(BattleTable.id, battleId as `bat_${string}`));

    // Update user battle stats
    await updateUserBattleStats(db, robot1, robot2, winnerId);
  } catch (error) {
    logger.error("Battle simulation failed", {
      error,
      battleId,
      robot1Id,
      robot2Id,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    await db
      .update(BattleTable)
      .set({ status: "CANCELLED" })
      .where(eq(BattleTable.id, battleId as `bat_${string}`));
  }
}

// Helper function to update user battle stats
async function updateUserBattleStats(
  db: any,
  robot1: any,
  robot2: any,
  winnerId: string
) {
  const [winner, loser] =
    winnerId === robot1.id ? [robot1, robot2] : [robot2, robot1];

  await db.transaction(async (tx: any) => {
    // Update winner stats
    await tx
      .update(UserBattleStatsTable)
      .set({ wins: sql`wins + 1` })
      .where(eq(UserBattleStatsTable.userId, winner.createdBy));

    // Update loser stats
    await tx
      .update(UserBattleStatsTable)
      .set({ losses: sql`losses + 1` })
      .where(eq(UserBattleStatsTable.userId, loser.createdBy));
  });
}

// Combine all routes
export const robotBattleApp = new OpenAPIHono<{ Variables: ContextVariables }>()
  .route("/", createRobotRoute)
  .route("/", startBattleRoute)
  .route("/", getBattleStatusRoute)
  .route("/", getUserRobotsRoute)
  .route("/", selectRobotRoute)
  .route("/", battleRoomRoutes);
