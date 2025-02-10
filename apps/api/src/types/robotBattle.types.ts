import { BattleStatus } from "@/db/schema/robotBattle.db";
import { UserId } from "cat-sdk";
import { BattleId, RobotId, RoundId } from "robot-sdk";
import { z } from "zod";


// Zod Schemas
export const RobotSchema = z.object({
  id: RobotId,
  name: z.string(),
  description: z.string(),
  prompt: z.string(),
  imageUrl: z.string().optional(),
  createdBy: UserId,
  createdAt: z.coerce.date(),
});

export const BattleSchema = z.object({
  id: BattleId,
  robot1Id: RobotId,
  robot2Id: RobotId,
  status: BattleStatus,
  winnerId: RobotId.optional(),
  startedAt: z.coerce.date(),
  completedAt: z.coerce.date().optional(),
});

export const BattleRoundSchema = z.object({
  id: RoundId,
  battleId: BattleId,
  roundNumber: z.number(),
  description: z.string(),
  tacticalAnalysis: z.string(),
  robot1Action: z.string(),
  robot2Action: z.string(),
  roundWinnerId: RobotId,
});

// Types from Schemas
export type Robot = z.infer<typeof RobotSchema>;
export type Battle = z.infer<typeof BattleSchema>;
export type BattleRound = z.infer<typeof BattleRoundSchema>;

// API Request/Response Types
export type CreateRobotRequest = {
  prompt: string;
};

export type StartBattleRequest = {
  robot1Id: RobotId;
  robot2Id: RobotId;
};

export type BattleStatusResponse = {
  battle: Battle;
  rounds: BattleRound[];
  robot1: Robot;
  robot2: Robot;
  winner?: Robot;
};

export type DamageType = "mobility" | "weapons" | "structural" | "power";

export interface RoundDamageResult {
  type: DamageType;
  location: string;
  severity: "light" | "moderate" | "severe";
  description: string;
}

export interface BattleDamageReport {
  robot1Damage: RoundDamageResult[];
  robot2Damage: RoundDamageResult[];
}
