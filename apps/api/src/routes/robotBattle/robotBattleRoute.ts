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
import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { OpenAI } from "openai";
import { env } from "@/env";
import { sql } from "drizzle-orm";
import type { BattleRound } from "@/types/robotBattle.types";

// Define Zod schemas for validation
const RobotIdSchema = z.string().regex(/^rob_[a-zA-Z0-9]+$/);
const BattleIdSchema = z.string().regex(/^bat_[a-zA-Z0-9]+$/);
const RoundIdSchema = z.string().regex(/^rnd_[a-zA-Z0-9]+$/);

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

      const robotData = JSON.parse(content);
      const robotId = generateId("robot") as `rob_${string}`;

      const [robot] = await db
        .insert(RobotTable)
        .values({
          id: robotId,
          name: robotData.name,
          description: robotData.description,
          prompt,
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

// Add new helper function for battle simulation
async function simulateBattle(
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

    // Simulate 3 rounds
    for (let roundNumber = 1; roundNumber <= 3; roundNumber++) {
      logger.info(`Starting round ${roundNumber}`);

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are an expert battle analyst and referee for intense robot battles. Provide detailed, visceral commentary of mechanical combat, including:
              - Specific damage descriptions (torn metal, severed hydraulics, sparking circuits)
              - Lasting battle effects (damaged mobility, compromised weapons, leaking fluids)
              - Strategic implications of damage (how injuries affect combat effectiveness)
              - Environmental interactions and hazards
              - Brutal but realistic robot combat mechanics
              
              Focus on creating a cinematic, high-stakes battle narrative suitable for an adult audience.
              
              Return a JSON object with:
              {
                "description": "Detailed and intense battle narrative with specific damage descriptions",
                "winner": "robot1 or robot2",
                "tacticalAnalysis": "Analysis of critical damage and tactical advantages that determined the round's outcome"
              }`,
          },
          {
            role: "user",
            content: `Round ${roundNumber}:
              Robot 1: "${robot1.name}" - ${robot1.description}
              Robot 2: "${robot2.name}" - ${robot2.description}
              
              Analyze their capabilities and narrate this battle round.`,
          },
        ],
      });

      const content = completion.choices[0].message.content;
      if (!content) {
        throw new Error("Failed to generate round results");
      }

      logger.info(`Round ${roundNumber} OpenAI response:`, content);

      try {
        const roundResult = JSON.parse(content);
        logger.info(`Round ${roundNumber} parsed result:`, roundResult);

        const roundWinnerId =
          roundResult.winner === "robot1" ? robot1Id : robot2Id;

        await db.insert(BattleRoundsTable).values({
          id: generateId("round"),
          battleId,
          roundNumber,
          description: roundResult.description,
          tacticalAnalysis: roundResult.tacticalAnalysis,
          robot1Action: `${robot1.name} engages in battle`,
          robot2Action: `${robot2.name} engages in battle`,
          roundWinnerId,
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
  .route("/", getBattleStatusRoute);
