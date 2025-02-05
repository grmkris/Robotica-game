import { relations } from "drizzle-orm";
import {
	CatActivitiesTable,
	CatInteractionsTable,
	CatMemoriesTable,
	CatTable,
	CatThoughtsTable,
	CatUserAffectionsTable,
} from "./catAgent.db";
import {
	emailVerificationCodes,
	items,
	sessions,
	transactions,
	userItems,
	users,
	wallets,
} from "./users.db";

// Relations from catAgent.db.ts
export const catsRelations = relations(CatTable, ({ many }) => ({
	memories: many(CatMemoriesTable),
	interactions: many(CatInteractionsTable),
	thoughts: many(CatThoughtsTable),
	userAffections: many(CatUserAffectionsTable),
	activities: many(CatActivitiesTable),
}));

export const memoriesRelations = relations(CatMemoriesTable, ({ one }) => ({
	cat: one(CatTable, {
		fields: [CatMemoriesTable.catId],
		references: [CatTable.id],
	}),
	interaction: one(CatInteractionsTable, {
		fields: [CatMemoriesTable.interactionId],
		references: [CatInteractionsTable.id],
	}),
	thought: one(CatThoughtsTable, {
		fields: [CatMemoriesTable.thoughtId],
		references: [CatThoughtsTable.id],
	}),
}));

export const interactionsRelations = relations(
	CatInteractionsTable,
	({ one, many }) => ({
		cat: one(CatTable, {
			fields: [CatInteractionsTable.catId],
			references: [CatTable.id],
		}),
		memories: many(CatMemoriesTable),
		user: one(users, {
			fields: [CatInteractionsTable.userId],
			references: [users.id],
		}),
		userItem: one(userItems, {
			fields: [CatInteractionsTable.userItemId],
			references: [userItems.id],
		}),
	}),
);

export const thoughtsRelations = relations(
	CatThoughtsTable,
	({ one, many }) => ({
		cat: one(CatTable, {
			fields: [CatThoughtsTable.catId],
			references: [CatTable.id],
		}),
		memories: many(CatMemoriesTable),
	}),
);

export const catUserAffectionsRelations = relations(
	CatUserAffectionsTable,
	({ one }) => ({
		cat: one(CatTable, {
			fields: [CatUserAffectionsTable.catId],
			references: [CatTable.id],
		}),
		user: one(users, {
			fields: [CatUserAffectionsTable.userId],
			references: [users.id],
		}),
	}),
);

export const catActivitiesRelations = relations(
	CatActivitiesTable,
	({ one }) => ({
		cat: one(CatTable, {
			fields: [CatActivitiesTable.catId],
			references: [CatTable.id],
		}),
	}),
);

export const autonomousThoughtsRelations = relations(
	CatThoughtsTable,
	({ one }) => ({
		cat: one(CatTable, {
			fields: [CatThoughtsTable.catId],
			references: [CatTable.id],
		}),
	}),
);

// Relations from users.db.ts
export const emailVerificationCodesRelations = relations(
	emailVerificationCodes,
	({ one }) => ({
		users: one(users, {
			fields: [emailVerificationCodes.userId],
			references: [users.id],
		}),
	}),
);

export const sessionsRelations = relations(sessions, ({ one }) => ({
	users: one(users, {
		fields: [sessions.userId],
		references: [users.id],
	}),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
	createdUsers: many(users, { relationName: "createdUsers" }),
	updatedUsers: many(users, { relationName: "updatedUsers" }),
	createdBy: one(users, {
		fields: [users.createdBy],
		references: [users.id],
		relationName: "createdUsers",
	}),
	updatedBy: one(users, {
		fields: [users.updatedBy],
		references: [users.id],
		relationName: "updatedUsers",
	}),
	emailVerificationCodes: many(emailVerificationCodes),
	sessions: many(sessions),
	interactions: many(CatInteractionsTable),
	userItems: many(userItems),
	transactions: many(transactions),
	catUserAffections: many(CatUserAffectionsTable),
	wallets: many(wallets),
}));

export const itemsRelations = relations(items, ({ many }) => ({
	userItems: many(userItems),
}));

export const userItemsRelations = relations(userItems, ({ one }) => ({
	user: one(users, {
		fields: [userItems.userId],
		references: [users.id],
	}),
	item: one(items, {
		fields: [userItems.itemId],
		references: [items.id],
	}),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
	user: one(users, {
		fields: [transactions.userId],
		references: [users.id],
	}),
	interaction: one(CatInteractionsTable, {
		fields: [transactions.interactionId],
		references: [CatInteractionsTable.id],
	}),
	item: one(items, {
		fields: [transactions.itemId],
		references: [items.id],
	}),
}));

export const walletsRelations = relations(wallets, ({ one }) => ({
	user: one(users, {
		fields: [wallets.userId],
		references: [users.id],
	}),
}));
