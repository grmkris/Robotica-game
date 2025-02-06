import {
  RobotTable,
  BattleTable,
  BattleRoundsTable,
  UserBattleStatsTable,
} from "@/db/schema/robotBattle.db";
import { validateUser } from "@/routes/helpers";
import type { ContextVariables } from "@/types";
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import {
  ROBOT_CLASSES,
  BATTLE_STATUS,
  generateId,
} from "@/types/robotBattle.types";
import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { OpenAI } from "openai";
import { env } from "@/env";
import { sql } from "drizzle-orm";

// Define Zod schemas for validation
const RobotIdSchema = z.string().regex(/^rob_/);
const BattleIdSchema = z.string().regex(/^bat_/);
const RoundIdSchema = z.string().regex(/^rnd_/);

// Create Robot Route
export const createRobotRoute = new OpenAPIHono<{
  Variables: ContextVariables;
}>().openapi(
  createRoute({
    method: "post",
    path: "create-robot",
    tags: ["RobotBattle"],
    summary: "Create a new robot from user prompt",
    request: {
      body: {
        content: {
          "application/json": {
            schema: z.object({
              prompt: z.string(),
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
              robotId: RobotIdSchema,
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
      // Initialize OpenAI
      const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

      // Process prompt with LLM to generate robot characteristics
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are a robot battle game master. Generate robot characteristics based on the user's prompt. Include name, class (ASSAULT/DEFENSE/SUPPORT/STEALTH/HEAVY), description, and stats (power: 1-100, defense: 1-100, speed: 1-100).",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const content = completion.choices[0].message.content;
      if (!content) {
        throw new HTTPException(500, {
          message: "Failed to generate robot characteristics",
        });
      }

      // Parse LLM response
      const robotStats = JSON.parse(content);

      const [robot] = await db
        .insert(RobotTable)
        .values({
          id: generateId("robot"),
          prompt,
          createdBy: user.id,
          ...robotStats,
        })
        .returning();

      return c.json({ robotId: robot.id });
    } catch (error) {
      logger.error("Failed to create robot", { error });
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
        where: eq(RobotTable.id, robot1Id as `rob${string}`),
      });
      const robot2 = await db.query.RobotTable.findFirst({
        where: eq(RobotTable.id, robot2Id as `rob${string}`),
      });

      if (!robot1 || !robot2) {
        throw new HTTPException(404, {
          message: "One or both robots not found",
        });
      }

      const [battle] = await db
        .insert(BattleTable)
        .values({
          id: generateId("battle"),
          robot1Id: robot1Id as `rob${string}`,
          robot2Id: robot2Id as `rob${string}`,
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
      where: eq(BattleTable.id, battleId as `bat${string}`),
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

// Add type for BattleRound
type BattleRound = {
  id: string;
  battleId: string;
  roundNumber: number;
  description: string;
  robot1Action: string;
  robot2Action: string;
  roundWinnerId: string;
};

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

    // Get robot details with proper type assertions
    const robot1 = await db.query.RobotTable.findFirst({
      where: eq(RobotTable.id, robot1Id as `rob${string}`),
    });
    const robot2 = await db.query.RobotTable.findFirst({
      where: eq(RobotTable.id, robot2Id as `rob${string}`),
    });

    if (!robot1 || !robot2) {
      throw new Error("One or both robots not found");
    }

    // Simulate 3 rounds
    for (let roundNumber = 1; roundNumber <= 3; roundNumber++) {
      // Generate round narrative using LLM
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are a robot battle announcer. Generate an exciting description of this battle round.",
          },
          {
            role: "user",
            content: `Round ${roundNumber}: ${robot1.name} (${robot1.class}) vs ${robot2.name} (${robot2.class})`,
          },
        ],
      });

      const content = completion.choices[0].message.content;
      if (!content) {
        throw new Error("Failed to generate round description");
      }

      const roundDescription = content;

      // Determine round winner based on stats and random chance
      const roundWinnerId = determineRoundWinner(robot1, robot2);

      // Save round
      await db.insert(BattleRoundsTable).values({
        id: generateId("round"),
        battleId,
        roundNumber,
        description: roundDescription,
        robot1Action: `${robot1.name} uses their ${robot1.class} abilities`,
        robot2Action: `${robot2.name} uses their ${robot2.class} abilities`,
        roundWinnerId,
      });
    }

    // Determine battle winner
    const rounds = await db.query.BattleRoundsTable.findMany({
      where: eq(BattleRoundsTable.battleId, battleId as `bat${string}`),
    });

    const robot1Wins = rounds.filter(
      (r: BattleRound) => r.roundWinnerId === robot1Id
    ).length;
    const robot2Wins = rounds.filter(
      (r: BattleRound) => r.roundWinnerId === robot2Id
    ).length;
    const winnerId = robot1Wins > robot2Wins ? robot1Id : robot2Id;

    // Update battle status
    await db
      .update(BattleTable)
      .set({
        status: "COMPLETED",
        winnerId,
        completedAt: new Date(),
      })
      .where(eq(BattleTable.id, battleId as `bat${string}`));

    // Update user battle stats
    await updateUserBattleStats(db, robot1, robot2, winnerId);
  } catch (error) {
    logger.error("Battle simulation failed", { error, battleId });
    await db
      .update(BattleTable)
      .set({ status: "CANCELLED" })
      .where(eq(BattleTable.id, battleId as `bat${string}`));
  }
}

// Helper function to determine round winner
function determineRoundWinner(robot1: any, robot2: any) {
  // Calculate battle scores based on stats and random factor
  const robot1Score =
    robot1.power * 0.4 +
    robot1.defense * 0.3 +
    robot1.speed * 0.3 +
    Math.random() * 20;

  const robot2Score =
    robot2.power * 0.4 +
    robot2.defense * 0.3 +
    robot2.speed * 0.3 +
    Math.random() * 20;

  return robot1Score > robot2Score ? robot1.id : robot2.id;
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
