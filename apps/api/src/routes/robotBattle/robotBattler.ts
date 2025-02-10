/**
 * Robot battler is a service that handles the logic for robot battles.
 * It is responsible for starting battles, updating battle results, and handling errors.
 */

import type { db } from "@/db/db";
import { BattleRobotsTable, BattleTable, RobotTable } from "@/db/schema/robotBattle.db";
import type { Logger } from "cat-logger";
import { eq } from "drizzle-orm";
import type { BattleId } from "robot-sdk";


/**
 * Battle requirements:
 * - Battle can have 2 or more robots
 * - Battle must have a winner
 * - Battle happens in multuple rounds until a winner is determined
 * - Each round has a damage report
 * - - Damage is substracted from the robot's health until one robot's health is 0 or less, that robot is eliminated
 * - - Rounds are processed recursively until a winner is determined
 */

export const resolveBattle = async (props: {
  battleId: BattleId;
  db: db;
  logger: Logger;
}) => {
  const { battleId, db, logger } = props;

  const battle = await db.query.BattleTable.findFirst({
    where: eq(BattleTable.id, battleId),
  });

  const robots = await db.query.BattleRobotsTable.findMany({
    where: eq(BattleRobotsTable.battleId, battleId),
  });

  const robot1 = await db.query.RobotTable.findFirst({
    where: eq(RobotTable.id, robots[0].robotId),
  });
};


