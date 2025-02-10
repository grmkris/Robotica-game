/**
 * Robot battler is a service that handles the logic for robot battles.
 * It is responsible for starting battles, updating battle results, and handling errors.
 */

import type { db } from "@/db/db";
import {
  BattleRobotsTable,
  BattleRoundsTable,
  BattleTable,
} from "@/db/schema/robotBattle.db";
import { env } from "@/env";
import { LiteralClient } from "@literalai/client";
import { executeStepStructured } from "cat-ai";
import type { Logger } from "cat-logger";
import { eq } from "drizzle-orm";
import type { BattleId } from "robot-sdk";
import { RobotId } from "robot-sdk";
import { z } from "zod";
/**
 * Battle requirements:
 * - Battle can have 2 or more robots
 * - Battle must have a winner
 * - Battle happens in multuple rounds until a winner is determined
 * - Each round has a damage report
 * - - Damage is substracted from the robot's health until one robot's health is 0 or less, that robot is eliminated
 * - - Rounds are processed recursively until a winner is determined
 */

// Create the client instance
const literalClient = new LiteralClient({
  apiKey: env.LITERAL_AI_API_KEY,
});

const RobotStateSchema = z.object({
  robotId: z.string(),
  currentHealth: z.number(),
  isAlive: z.boolean(),
  status: z.array(z.string()), // For effects like "damaged armor", "weapon malfunction" etc
});

const BattleActionSchema = z.object({
  attackerId: z.string(),
  defenderId: z.string(),
  damage: z.number(),
  description: z.string(),
});

const BattleRoundSchema = z.object({
  roundNumber: z.number(),
  narrative: z.string(),
  actions: z.array(BattleActionSchema),
  tacticalAnalysis: z.string(),
});

type RobotState = z.infer<typeof RobotStateSchema>;

export const _resolveBattle = async (props: {
  battleId: BattleId;
  db: db;
  logger: Logger;
}) => {
  const { battleId, db, logger } = props;

  // Get battle and robots data
  const battle = await db.query.BattleTable.findFirst({
    where: eq(BattleTable.id, battleId),
  });
  if (!battle) throw new Error(`Battle ${battleId} not found`);

  const battleRobots = await db.query.BattleRobotsTable.findMany({
    where: eq(BattleRobotsTable.battleId, battleId),
    with: {
      robot: true,
    },
  });
  if (battleRobots.length < 2) throw new Error("Not enough robots for battle");

  // Initialize robot states
  const robotStates = new Map<string, RobotState>(
    battleRobots.map((br) => [
      br.robotId,
      {
        robotId: br.robotId,
        currentHealth: 100,
        isAlive: true,
        status: [],
      },
    ]),
  );

  let roundNumber = 1;

  // Create thread once before processing rounds
  const threadId = `battle-${battleId}`;
  return await literalClient
    .thread({
      id: threadId,
      name: `Battle ${battleId}`,
      metadata: { battleId },
    })
    .wrap(async () => {
      // Process rounds until we have a winner
      while (Array.from(robotStates.values()).filter((r) => r.isAlive).length > 1) {
        await processRound({
          battleId,
          roundNumber,
          robotStates,
          db,
          logger,
        });
        roundNumber++;
      }

      // Update battle with winner
      const winner = Array.from(robotStates.values()).find((r) => r.isAlive);
      if (!winner) throw new Error("No winner found after battle");

      await db
        .update(BattleTable)
        .set({
          winnerId: RobotId.parse(winner.robotId),
          status: "COMPLETED",
          completedAt: new Date(),
        })
        .where(eq(BattleTable.id, battleId));

      return winner.robotId;
    });
};

export const resolveBattle = async (props: {
  battleId: BattleId;
  db: db;
  logger: Logger;
}) => {
  const { battleId, db, logger } = props;
  try {
    return await _resolveBattle({ battleId, db, logger });
  } catch (error) {
    logger.error({
      msg: "Failed to resolve battle",
      error,
    });
    // update battle status to failed
    await db
      .update(BattleTable)
      .set({
        status: "FAILED",
        completedAt: new Date(),
      })
  }
};

const processRound = async (props: {
  battleId: BattleId;
  roundNumber: number;
  robotStates: Map<string, RobotState>;
  db: db;
  logger: Logger;
}) => {
  const { battleId, roundNumber, robotStates, db, logger } = props;

  // Simulate the round
  const roundResult = await literalClient
    .step({
      name: `Simulate Round ${roundNumber}`,
      type: "llm",
      metadata: {
        battleId,
        roundNumber,
        operation: "simulate_round",
      },
    })
    .wrap(async () => {
      return await executeStepStructured<typeof BattleRoundSchema>({
        stepName: "battle_round",
        input: JSON.stringify({
          roundNumber,
          robotStates: Array.from(robotStates.values()),
        }),
        system: createBattlePrompt(roundNumber, robotStates),
        logger,
        providerConfig: {
          apikey: env.GOOGLE_GEMINI_API_KEY,
          modelId: "gemini-2.0-flash-exp",
          provider: "google",
        },
        literalClient,
        stepId: `round_${roundNumber}`,
        output: {
          outputSchema: BattleRoundSchema,
          schemaDescription: "The battle round results",
          schemaName: "BattleRound",
          temperature: 0.7,
        },
      });
    });

  // Apply damage and update states
  await literalClient
    .step({
      name: "Apply Round Results",
      type: "run",
      input: roundResult,
      metadata: {
        operation: "apply_damage",
      },
    })
    .wrap(async () => {
      // Apply damages to robot states
      for (const action of roundResult.actions) {
        const state = robotStates.get(action.defenderId);
        if (state?.isAlive) {
          state.currentHealth -= action.damage;
          state.status.push(action.description);
          if (state.currentHealth <= 0) {
            state.isAlive = false;
            state.status.push("ELIMINATED");
          }
        }
      }

      // Save round results to database
      await db.insert(BattleRoundsTable).values({
        battleId,
        roundNumber,
        description: roundResult.narrative,
        tacticalAnalysis: roundResult.tacticalAnalysis,
        createdAt: new Date(),
      });
    });
};

const createBattlePrompt = (
  roundNumber: number,
  robotStates: Map<string, RobotState>,
) => {
  const aliveRobots = Array.from(robotStates.values()).filter((r) => r.isAlive);

  return `You are simulating a battle between ${aliveRobots.length} robots.
Round ${roundNumber} is about to begin.

Current robot states:
${Array.from(robotStates.values())
      .map(
        (robot) => `
- Robot ${robot.robotId}:
  Health: ${robot.currentHealth}
  Status: ${robot.status.join(", ") || "Normal"}
  ${robot.isAlive ? "ACTIVE" : "ELIMINATED"}
`,
      )
      .join("\n")}

Generate an exciting battle round with clear outcomes. For each attack:
1. Choose which robot attacks which other robot
2. Determine a realistic damage amount (1-30)
3. Write a brief but vivid description of what happened

Keep the narrative exciting but focused on the key actions.`;
};
