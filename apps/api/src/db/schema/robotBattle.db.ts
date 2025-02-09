import { generateId } from "@/types/robotBattle.types";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  integer,
  pgEnum,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./users.db";
import type { RoomId } from "@/types/robotBattle.types";

// Update the robot classes to be more descriptive
export const ROBOT_CLASSES = [
  "ASSAULT",
  "DEFENSE",
  "SUPPORT",
  "STEALTH",
  "HEAVY",
] as const;

export const robotClassEnum = pgEnum("robot_class", ROBOT_CLASSES);
export const battleStatusEnum = pgEnum("battle_status", [
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
]);

// Robot table
export const RobotTable = pgTable("robots", {
  id: varchar("id", { length: 255 }).primaryKey().$type<`rob_${string}`>(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  prompt: text("prompt").notNull(),
  createdBy: varchar("created_by", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
});

// Battle table
export const BattleTable = pgTable("battles", {
  id: varchar("id", { length: 255 }).primaryKey().$type<`bat_${string}`>(),
  robot1Id: varchar("robot1_id", { length: 255 })
    .notNull()
    .references(() => RobotTable.id),
  robot2Id: varchar("robot2_id", { length: 255 })
    .notNull()
    .references(() => RobotTable.id),
  status: battleStatusEnum("status").notNull(),
  winnerId: varchar("winner_id", { length: 255 }).$type<`rob${string}`>(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

// Battle Rounds table (for detailed battle progression)
export const BattleRoundsTable = pgTable("battle_rounds", {
  id: varchar("id", { length: 255 }).primaryKey().$type<`rnd_${string}`>(),
  battleId: varchar("battle_id", { length: 255 })
    .$type<`bat${string}`>()
    .notNull(),
  roundNumber: integer("round_number").notNull(),
  description: text("description").notNull(), // AI-generated battle narrative
  tacticalAnalysis: text("tactical_analysis").notNull(), // AI's explanation of the outcome
  robot1Action: text("robot1_action").notNull(),
  robot2Action: text("robot2_action").notNull(),
  roundWinnerId: varchar("round_winner_id", { length: 255 })
    .$type<`rob${string}`>()
    .notNull(),
});

// Add user stats/rankings table
export const UserBattleStatsTable = pgTable(
  "user_battle_stats",
  {
    id: varchar("id", { length: 255 })
      .primaryKey()
      .$defaultFn(() => generateId("stats")),
    userId: varchar("user_id", { length: 255 }).notNull(),
    wins: integer("wins").notNull().default(0),
    losses: integer("losses").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    selectedRobotId: varchar("selected_robot_id", { length: 255 })
      .$type<`rob_${string}`>()
      .references(() => RobotTable.id),
  },
  (table) => ({
    userIdIdx: uniqueIndex("user_battle_stats_user_id_idx").on(table.userId),
  })
);

// Add to your existing robotBattle.db.ts
export const battleRoomStatusEnum = pgEnum("battle_room_status", [
  "WAITING", // Room created, waiting for opponent
  "READY", // Both players joined, ready to start
  "IN_PROGRESS", // Battle is ongoing
  "COMPLETED", // Battle finished
  "EXPIRED", // Room timed out without opponent
]);

export const BattleRoomTable = pgTable("battle_rooms", {
  id: varchar("id", { length: 255 })
    .primaryKey()
    .$type<RoomId>()
    .$defaultFn(() => generateId("room") as RoomId),
  createdBy: varchar("created_by", { length: 255 })
    .notNull()
    .references(() => users.id),
  robot1Id: varchar("robot1_id", { length: 255 })
    .notNull()
    .$type<`rob_${string}`>()
    .references(() => RobotTable.id),
  robot2Id: varchar("robot2_id", { length: 255 })
    .$type<`rob_${string}`>()
    .references(() => RobotTable.id),
  status: battleRoomStatusEnum("status").notNull().default("WAITING"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
  expiresAt: timestamp("expires_at", {
    withTimezone: true,
    mode: "date",
  }).notNull(),
  battleId: varchar("battle_id", { length: 255 }).references(
    () => BattleTable.id
  ),
});
