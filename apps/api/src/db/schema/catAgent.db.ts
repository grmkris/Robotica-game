import { userItems, users } from "@/db/schema/users.db";
import {
	ALL_INTERACTION_TYPES,
	CAT_ACTIVITIES,
	CAT_EMOTIONS,
	CAT_SPOTS,
	type CatActivityId,
	type CatEmotion,
	type CatId,
	type CatInteractionId,
	type CatMemoryId,
	type CatThoughtId,
	type CatUserAffectionId,
	INPUT_VALIDATION_STATUS,
	INTERACTION_STATUS,
	THOUGHT_TYPES,
	type ThoughtType,
	type UserId,
	type UserItemId,
	generateId,
} from "cat-sdk";
import {
	integer,
	numeric,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";

export const PgCatEmotionEnum = pgEnum("cat_emotion", CAT_EMOTIONS);
export const PgCatSpotEnum = pgEnum("favorite_spot", CAT_SPOTS);
export const PgCatActivityEnum = pgEnum("cat_activity", CAT_ACTIVITIES);
export const PgInteractionStatusEnum = pgEnum(
	"interaction_status",
	INTERACTION_STATUS,
);

export const PgInputValidationStatusEnum = pgEnum(
	"input_validation_status",
	INPUT_VALIDATION_STATUS,
);
export const PgInteractionTypeEnum = pgEnum(
	"interaction_type",
	ALL_INTERACTION_TYPES,
);

export const PgThoughtTypeEnum = pgEnum("thought_type", THOUGHT_TYPES);

/**
 * Table that holds cats and their stats
 */
export const CatTable = pgTable("cats", {
	id: varchar("id", { length: 255 })
		.primaryKey()
		.$defaultFn(() => generateId("cat"))
		.$type<CatId>(),
	name: varchar("name", { length: 255 }).notNull(),
	hunger: integer("hunger").notNull().$type<number>(),
	happiness: integer("happiness").notNull().$type<number>(),
	energy: integer("energy").notNull().$type<number>(),
	description: text("description").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
		.defaultNow()
		.notNull(),
});

/**
 * Table that holds memories of the cat
 */
export const CatMemoriesTable = pgTable("cat_memories", {
	id: varchar("id", { length: 255 })
		.primaryKey()
		.$defaultFn(() => generateId("memory"))
		.$type<CatMemoryId>(),
	catId: varchar("cat_id", { length: 255 })
		.notNull()
		.references(() => CatTable.id)
		.$type<CatId>(),
	userId: varchar("user_id", { length: 255 })
		.notNull()
		.references(() => users.id)
		.$type<UserId>(),
	interactionId: varchar("interaction_id", { length: 255 })
		.references(() => CatInteractionsTable.id)
		.$type<CatInteractionId>(),
	thoughtId: varchar("thought_id", { length: 255 })
		.references(() => CatThoughtsTable.id)
		.$type<CatThoughtId>(),
	memory: text("memory").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
		.defaultNow()
		.notNull(),
});

/**
 * Table that holds interactions between the cat and the users
 */
export const CatInteractionsTable = pgTable("cat_interactions", {
	id: varchar("id", { length: 255 })
		.primaryKey()
		.$defaultFn(() => generateId("interaction"))
		.$type<CatInteractionId>(),
	userId: varchar("user_id", { length: 255 })
		.notNull()
		.references(() => users.id)
		.$type<UserId>(),
	catId: varchar("cat_id", { length: 255 })
		.notNull()
		.references(() => CatTable.id)
		.$type<CatId>(),
	userItemId: varchar("user_item_id", { length: 255 })
		.references(() => userItems.id)
		.$type<UserItemId>(),
	type: PgInteractionTypeEnum("type").notNull(),
	status: PgInteractionStatusEnum("status").notNull().default("PENDING"),
	cost: numeric("cost").notNull().$type<number>(),
	input: text("input"),
	thinkingProcess: text("thinking_process"),
	processedInput: text("processed_input"),
	output: text("output"),
	outputEmotion: PgCatEmotionEnum("output_emotion").array(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
		.defaultNow()
		.notNull(),
});

/**
 * Table that holds the affection of the cat for the user
 */
export const CatUserAffectionsTable = pgTable(
	"cat_user_affections",
	{
		id: varchar("id", { length: 255 })
			.primaryKey()
			.$defaultFn(() => generateId("catUserAffection"))
			.$type<CatUserAffectionId>(),
		catId: varchar("cat_id", { length: 255 })
			.notNull()
			.references(() => CatTable.id)
			.$type<CatId>(),
		userId: varchar("user_id", { length: 255 })
			.notNull()
			.references(() => users.id)
			.$type<UserId>(),
		affection: numeric("affection").notNull().$type<number>(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		uniqueIndex("unq_cat_user").on(table.catId, table.userId),
		uniqueIndex("cat_user_affections_affection_idx").on(table.affection),
	],
);

/**
 * Table that holds the activities of the cat
 */
export const CatActivitiesTable = pgTable("cat_activities", {
	id: varchar("id", { length: 255 })
		.primaryKey()
		.$defaultFn(() => generateId("catActivity"))
		.$type<CatActivityId>(),
	catId: varchar("cat_id", { length: 255 })
		.notNull()
		.references(() => CatTable.id)
		.$type<CatId>(),
	activity: PgCatActivityEnum("activity").notNull(),
	location: PgCatSpotEnum("location").notNull(),
	description: text("description").notNull(),
	startTime: timestamp("start_time", { withTimezone: true, mode: "date" })
		.defaultNow()
		.notNull(),
	endTime: timestamp("end_time", { withTimezone: true, mode: "date" }),
});

/**
 * Table that holds thoughts of the cat
 */
export const CatThoughtsTable = pgTable("cat_thoughts", {
	id: varchar("id", { length: 255 })
		.primaryKey()
		.$defaultFn(() => generateId("thought"))
		.$type<CatThoughtId>(),
	catId: varchar("cat_id", { length: 255 })
		.notNull()
		.references(() => CatTable.id)
		.$type<CatId>(),
	type: PgThoughtTypeEnum("type").notNull().$type<ThoughtType>(),
	content: text("content").notNull(),
	emotion: PgCatEmotionEnum("emotion").array().$type<CatEmotion[]>(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
		.defaultNow()
		.notNull(),
});
