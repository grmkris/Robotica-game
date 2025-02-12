import {
	boolean,
	numeric,
	pgEnum,
	pgTable,
	serial,
	text,
	timestamp,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";
import type { ItemId, UserId, UserItemId, WalletId } from "robot-sdk";
import { generateId } from "robot-sdk";
import { z } from "zod";

// Add this near the top of the file
export const USER_ROLES = ["USER", "ADMIN"] as const;
export const UserRole = z.enum(USER_ROLES);
export type UserRole = z.infer<typeof UserRole>;

// Add this near the top of the file, after the USER_ROLES definition
export const userRoleEnum = pgEnum("user_role", USER_ROLES);

export const users = pgTable(
	"users",
	{
		id: varchar("id", { length: 255 })
			.primaryKey()
			.$defaultFn(() => generateId("user"))
			.$type<UserId>(),
		username: varchar("username", { length: 255 }).notNull().unique(),
		email: varchar("email", {
			length: 255,
		}),
		name: varchar("name", { length: 255 }),
		normalizedEmail: varchar("normalized_email", {
			length: 255,
		}),
		emailVerified: boolean("email_verified").default(false),
		hashedPassword: varchar("hashed_password").default("").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
			.defaultNow()
			.notNull(),
		createdBy: varchar("created_by", { length: 255 }),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
			.defaultNow()
			.notNull(),
		updatedBy: varchar("updated_by", { length: 255 }),
		purrlons: numeric("purrlons").notNull().default("0").$type<number>(),
	},
	(table) => [
		uniqueIndex("normalized_email_idx").on(table.normalizedEmail),
		uniqueIndex("username_idx").on(table.username),
	],
);

export const emailVerificationCodes = pgTable("email_verification_codes", {
	id: serial("id").primaryKey(),
	code: varchar("code", {
		length: 8,
	}).notNull(),
	expiresAt: timestamp("expires_at", {
		withTimezone: true,
		mode: "date",
	}).notNull(),

	userId: varchar("user_id")
		.notNull()
		.references(() => users.id)
		.$type<UserId>(),
});

export const sessions = pgTable("sessions", {
	id: text("id").primaryKey(),
	expiresAt: timestamp("expires_at", {
		withTimezone: true,
		mode: "date",
	}).notNull(),

	userId: varchar("user_id")
		.notNull()
		.references(() => users.id)
		.$type<UserId>(),
});

// Add these new enums
export const ITEM_TYPES = ["TOY", "FOOD", "FURNITURE"] as const;
export const ItemType = z.enum(ITEM_TYPES);
export type ItemType = z.infer<typeof ItemType>;

export const itemTypeEnum = pgEnum("item_type", ["CONSUMABLE", "EQUIPMENT"]);

// Add new tables
export const items = pgTable("items", {
	id: varchar("id", { length: 255 })
		.primaryKey()
		.$defaultFn(() => generateId("item"))
		.$type<ItemId>(),
	name: varchar("name", { length: 255 }).notNull(),
	description: text("description"),
	type: itemTypeEnum("type").notNull(),
	imageUrl: varchar("image_url", { length: 255 }).notNull(),
	price: numeric("price").notNull().$type<number>(),
	effect: numeric("effect").notNull().$type<number>(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
		.defaultNow()
		.notNull(),
});

export const userItems = pgTable("user_items", {
	id: varchar("id", { length: 255 })
		.primaryKey()
		.$defaultFn(() => generateId("userItem"))
		.$type<UserItemId>(),
	userId: varchar("user_id", { length: 255 })
		.notNull()
		.references(() => users.id)
		.$type<UserId>(),
	itemId: varchar("item_id", { length: 255 })
		.notNull()
		.references(() => items.id)
		.$type<ItemId>(),
	quantity: numeric("quantity", { precision: 10, scale: 0 })
		.notNull()
		.default("1")
		.$type<number>(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
		.defaultNow()
		.notNull(),
});

// Add near the top with other enums
export const TRANSACTION_TYPES = ["EARNED", "SPENT"] as const;
export const TransactionType = z.enum(TRANSACTION_TYPES);
export type TransactionType = z.infer<typeof TransactionType>;

export const transactionTypeEnum = pgEnum(
	"transaction_type",
	TRANSACTION_TYPES,
);

// Add near the top with other enums
export const TRANSACTION_CATEGORIES = [
	"INTERACTION",
	"SHOP",
	"REWARD",
	"DAILY_BONUS",
] as const;
export const TransactionCategory = z.enum(TRANSACTION_CATEGORIES);
export type TransactionCategory = z.infer<typeof TransactionCategory>;

export const transactionCategoryEnum = pgEnum(
	"transaction_category",
	TRANSACTION_CATEGORIES,
);

// Add new transactions table
export const transactions = pgTable("transactions", {
	id: varchar("id", { length: 255 })
		.primaryKey()
		.$defaultFn(() => generateId("transaction")),
	userId: varchar("user_id", { length: 255 })
		.notNull()
		.references(() => users.id)
		.$type<UserId>(),
	amount: numeric("amount").notNull().$type<number>(),
	type: transactionTypeEnum("type").notNull(),
	category: transactionCategoryEnum("category").notNull(),
	itemId: varchar("item_id", { length: 255 })
		.references(() => items.id)
		.$type<ItemId>(),
	description: text("description").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
		.defaultNow()
		.notNull(),
});

// Add new wallets table after the users table
export const wallets = pgTable(
	"wallets",
	{
		id: varchar("id", { length: 255 })
			.primaryKey()
			.$defaultFn(() => generateId("wallet"))
			.$type<WalletId>(),
		userId: varchar("user_id", { length: 255 })
			.notNull()
			.references(() => users.id)
			.$type<UserId>(),
		address: varchar("address", { length: 255 }).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		// Create unique constraint on address and chainId combination
		uniqueIndex("wallet_address_idx").on(table.address),
	],
);
