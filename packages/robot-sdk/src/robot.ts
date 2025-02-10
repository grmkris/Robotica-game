import { z } from "zod";
import type { RobotId } from "./id";

// Battle Status
export const BATTLE_STATUS = ["IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
export type BattleStatus = (typeof BATTLE_STATUS)[number];

// Zod Schemas
export const RobotSchema = z.object({
	id: z.string().regex(/^rob/),
	name: z.string(),
	description: z.string(),
	prompt: z.string(),
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
