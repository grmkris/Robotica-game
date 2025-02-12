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
	type BattleId,
	type BattleRobotId,
	type RobotId,
	type StatsId,
	type UserId,
	type RoundId,
	generateId,
} from "robot-sdk";
import { z } from "zod";
import { users } from "./users.db";

// Update the robot classes to be more descriptive
export const ROBOT_CLASSES = [
	"ASSAULT",
	"DEFENSE",
	"SUPPORT",
	"STEALTH",
	"HEAVY",
] as const;

export const robotClassEnum = pgEnum("robot_class", ROBOT_CLASSES);
export const BATTLE_STATUS = [
	"WAITING",
	"IN_PROGRESS",
	"COMPLETED",
	"CANCELLED",
	"FAILED",
] as const;
export const BattleStatus = z.enum(BATTLE_STATUS);
export const battleStatusEnum = pgEnum("battle_status", BATTLE_STATUS);

// Robot table
export const RobotTable = pgTable("robots", {
	id: varchar("id", { length: 255 }).primaryKey().$type<RobotId>(),
	name: varchar("name", { length: 255 }).notNull(),
	description: text("description").notNull(),
	prompt: text("prompt").notNull(),
	imageUrl: text("image_url"),
	createdBy: varchar("created_by", { length: 255 })
		.notNull()
		.references(() => users.id)
		.$type<UserId>(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
		.defaultNow()
		.notNull(),
});

// Battle table
export const BattleTable = pgTable("battles", {
	id: varchar("id", { length: 255 })
		.primaryKey()
		.$type<BattleId>()
		.$defaultFn(() => generateId("battle")),
	status: battleStatusEnum("status").notNull(),
	winnerId: varchar("winner_id", { length: 255 })
		.$type<RobotId>()
		.references(() => RobotTable.id),
	startedAt: timestamp("started_at").defaultNow().notNull(),
	completedAt: timestamp("completed_at"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
		.defaultNow()
		.notNull(),
	createdBy: varchar("created_by", { length: 255 })
		.notNull()
		.references(() => users.id)
		.$type<UserId>(),
	gameId: integer("game_id").default(0).notNull(),
});

// Battle Robots table
export const BattleRobotsTable = pgTable("battle_robots", {
	id: varchar("id", { length: 255 }).primaryKey().$type<BattleRobotId>(),
	battleId: varchar("battle_id", { length: 255 })
		.$type<BattleId>()
		.notNull()
		.references(() => BattleTable.id),
	robotId: varchar("robot_id", { length: 255 })
		.$type<RobotId>()
		.notNull()
		.references(() => RobotTable.id),
	createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
		.defaultNow()
		.notNull(),
});

// Battle Rounds table (for detailed battle progression)
export const BattleRoundsTable = pgTable("battle_rounds", {
	id: varchar("id", { length: 255 }).$type<RoundId>().primaryKey(),
	battleId: varchar("battle_id", { length: 255 })
		.$type<BattleId>()
		.notNull()
		.references(() => BattleTable.id),
	roundNumber: integer("round_number").notNull(),
	description: text("description").notNull(),
	tacticalAnalysis: text("tactical_analysis").notNull(),
	winnerId: varchar("winner_id", { length: 255 })
		.$type<RobotId>()
		.references(() => RobotTable.id),
	createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Add user stats/rankings table
export const UserBattleStatsTable = pgTable(
	"user_battle_stats",
	{
		id: varchar("id", { length: 255 })
			.primaryKey()
			.$defaultFn(() => generateId("stats"))
			.$type<StatsId>(),
		userId: varchar("user_id", { length: 255 })
			.notNull()
			.$type<UserId>()
			.references(() => users.id),
		wins: integer("wins").notNull().default(0),
		losses: integer("losses").notNull().default(0),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
			.defaultNow()
			.notNull(),
		selectedRobotId: varchar("selected_robot_id", { length: 255 })
			.$type<RobotId>()
			.references(() => RobotTable.id),
		createdBy: varchar("created_by", { length: 255 })
			.notNull()
			.references(() => users.id)
			.$type<UserId>(),
	},
	(table) => [uniqueIndex("user_battle_stats_user_id_idx").on(table.userId)],
);

export const BATTLE_ROOM_STATUSES = [
	"WAITING",
	"READY",
	"IN_PROGRESS",
	"COMPLETED",
	"EXPIRED",
] as const;

export const battleRoomStatusEnum = pgEnum(
	"battle_room_status",
	BATTLE_ROOM_STATUSES,
);
export const BattleRoomStatus = z.enum(BATTLE_ROOM_STATUSES);
