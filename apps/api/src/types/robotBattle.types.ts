import { z } from "zod";

// ID Types
export type RobotId = `rob_${string}`;
export type BattleId = `bat_${string}`;
export type RoundId = `rnd_${string}`;
export type StatsId = `stats_${string}`;
export type UserId = `user${string}`;
export type RoomId = `room_${string}`;

// Add "room" to the possible types
export type IdType = "robot" | "battle" | "round" | "stats" | "room";

// Generate ID function
export function generateId(
  type: IdType
): RobotId | BattleId | RoundId | StatsId | RoomId {
  const uuid = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  switch (type) {
    case "robot":
      return `rob_${uuid}` as RobotId;
    case "battle":
      return `bat_${uuid}` as BattleId;
    case "round":
      return `rnd_${uuid}` as RoundId;
    case "stats":
      return `stats_${uuid}` as StatsId;
    case "room":
      return `room_${uuid}` as RoomId;
  }
}

// Battle Status
export const BATTLE_STATUS = ["IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
export type BattleStatus = (typeof BATTLE_STATUS)[number];

// Zod Schemas
export const RobotSchema = z.object({
  id: z.string().regex(/^rob/),
  name: z.string(),
  description: z.string(),
  prompt: z.string(),
  imageUrl: z.string().optional(),
  createdBy: z.string(),
  createdAt: z.date(),
});

export const BattleSchema = z.object({
  id: z.string().regex(/^bat/),
  robot1Id: z.string().regex(/^rob/),
  robot2Id: z.string().regex(/^rob/),
  status: z.enum(BATTLE_STATUS),
  winnerId: z.string().regex(/^rob/).optional(),
  startedAt: z.date(),
  completedAt: z.date().optional(),
});

export const BattleRoundSchema = z.object({
  id: z.string().regex(/^rnd/),
  battleId: z.string().regex(/^bat/),
  roundNumber: z.number(),
  description: z.string(),
  tacticalAnalysis: z.string(),
  robot1Action: z.string(),
  robot2Action: z.string(),
  roundWinnerId: z.string().regex(/^rob/),
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
