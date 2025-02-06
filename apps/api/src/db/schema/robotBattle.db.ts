import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import {
  generateId,
  ROBOT_CLASSES,
  BATTLE_STATUS,
  type RobotId,
  type BattleId,
  type RoundId,
  type UserId,
  type StatsId,
} from "../../types/robotBattle.types";

// Enums for robot characteristics
export const PgRobotClassEnum = pgEnum("robot_class", ROBOT_CLASSES);
export const PgBattleStatusEnum = pgEnum("battle_status", BATTLE_STATUS);

// Main Robot table
export const RobotTable = pgTable("robots", {
  id: varchar("id", { length: 255 })
    .primaryKey()
    .$defaultFn(() => generateId("robot"))
    .$type<RobotId>(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  prompt: text("prompt").notNull(), // The original prompt that created this robot
  class: PgRobotClassEnum("class").notNull(),
  power: integer("power").notNull(),
  defense: integer("defense").notNull(),
  speed: integer("speed").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
  createdBy: varchar("created_by", { length: 255 }).notNull(), // User ID
});

// Battle table
export const BattleTable = pgTable("battles", {
  id: varchar("id", { length: 255 })
    .primaryKey()
    .$defaultFn(() => generateId("battle"))
    .$type<BattleId>(),
  robot1Id: varchar("robot1_id", { length: 255 })
    .notNull()
    .references(() => RobotTable.id)
    .$type<RobotId>(),
  robot2Id: varchar("robot2_id", { length: 255 })
    .notNull()
    .references(() => RobotTable.id),
  status: PgBattleStatusEnum("status").notNull().default("PENDING"),
  winnerId: varchar("winner_id", { length: 255 }).references(
    () => RobotTable.id
  ),
  judgeReasoning: text("judge_reasoning"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
});

// Battle Rounds table (for detailed battle progression)
export const BattleRoundsTable = pgTable("battle_rounds", {
  id: varchar("id", { length: 255 })
    .primaryKey()
    .$defaultFn(() => generateId("round"))
    .$type<RoundId>(),
  battleId: varchar("battle_id", { length: 255 })
    .notNull()
    .references(() => BattleTable.id),
  roundNumber: integer("round_number").notNull(),
  description: text("description").notNull(),
  robot1Action: text("robot1_action").notNull(),
  robot2Action: text("robot2_action").notNull(),
  roundWinnerId: varchar("round_winner_id", { length: 255 }).references(
    () => RobotTable.id
  ),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
});

// Add user stats/rankings table
export const UserBattleStatsTable = pgTable(
  "user_battle_stats",
  {
    id: varchar("id", { length: 255 })
      .primaryKey()
      .$defaultFn(() => generateId("stats"))
      .$type<StatsId>(),
    userId: varchar("user_id", { length: 255 }).notNull().$type<UserId>(),
    wins: integer("wins").notNull().default(0),
    losses: integer("losses").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdIdx: uniqueIndex("user_battle_stats_user_id_idx").on(table.userId),
  })
);
