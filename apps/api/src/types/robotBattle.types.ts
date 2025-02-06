// ID Types
export type RobotId = `rob${string}`;
export type BattleId = `bat${string}`;
export type RoundId = `rnd${string}`;
export type UserId = `usr${string}`; // Reusing from existing types if available
export type StatsId = `sts${string}`;

// Robot Classes
export const ROBOT_CLASSES = [
  "ASSAULT",
  "DEFENSE",
  "SUPPORT",
  "STEALTH",
  "HEAVY",
] as const;
export type RobotClass = (typeof ROBOT_CLASSES)[number];

// Battle Status
export const BATTLE_STATUS = [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;
export type BattleStatus = (typeof BATTLE_STATUS)[number];

// Utility function for ID generation
export function generateId(type: "robot"): RobotId;
export function generateId(type: "battle"): BattleId;
export function generateId(type: "round"): RoundId;
export function generateId(type: "stats"): StatsId;
export function generateId(type: string): string {
  const prefix = {
    robot: "rob",
    battle: "bat",
    round: "rnd",
    stats: "sts",
  }[type];

  return `${prefix}_${Math.random().toString(36).substr(2, 9)}` as any;
}
