import {
	CatActivitiesTable,
	CatInteractionsTable,
	CatMemoriesTable,
	CatTable,
	CatThoughtsTable,
	CatUserAffectionsTable,
} from "@/db/schema/catAgent.db";
import {
	UserRole,
	emailVerificationCodes,
	items,
	sessions,
	transactions,
	userItems,
	users,
	wallets,
} from "@/db/schema/users.db";
import {
	CAT_EMOTIONS,
	CatActivity,
	CatActivityId,
	CatEmotion,
	CatId,
	CatInteractionId,
	CatMemoryId,
	CatSpot,
	CatThoughtId,
	CatUserAffectionId,
	EvmAddress,
	InteractionStatus,
	ItemId,
	UserId,
	UserItemId,
	WalletChainId,
	WalletType,
} from "cat-sdk";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const InsertCatSchema = createInsertSchema(CatTable, {
	id: CatId,
}).omit({
	createdAt: true,
	updatedAt: true,
});

export const SelectMemorySchema = createSelectSchema(CatMemoriesTable, {
	id: CatMemoryId,
	catId: CatId,
	userId: UserId,
	interactionId: CatInteractionId.nullish(),
	thoughtId: CatThoughtId.nullish(),
	memory: z.string(),
	createdAt: z.coerce.date(),
});

export const SelectThoughtSchema = createSelectSchema(CatThoughtsTable, {
	id: CatThoughtId,
	catId: CatId,
	type: z.string(),
	content: z.string(),
	emotion: z.array(CatEmotion).nullable(),
	createdAt: z.coerce.date(),
});

export const InsertThoughtSchema = createInsertSchema(CatThoughtsTable, {
	id: CatThoughtId,
	content: z.string(),
	catId: CatId,
}).omit({
	id: true,
	createdAt: true,
});

export const InsertMemorySchema = createInsertSchema(CatMemoriesTable, {
	interactionId: CatInteractionId,
	thoughtId: CatThoughtId,
	userId: UserId,
	memory: z.string(),
	id: CatMemoryId,
}).omit({
	id: true,
	createdAt: true,
	catId: true,
});

export const SelectCatUserAffectionSchema = createSelectSchema(
	CatUserAffectionsTable,
	{
		id: CatUserAffectionId,
		catId: CatId,
		userId: UserId,
		affection: z.coerce.number(),
		updatedAt: z.coerce.date(),
	},
);

export const SelectWalletSchema = createSelectSchema(wallets, {
	userId: UserId,
	type: WalletType,
	chainId: WalletChainId,
	address: EvmAddress,
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
});

export const InsertWalletSchema = createInsertSchema(wallets, {
	userId: UserId,
	chainId: WalletChainId,
	address: EvmAddress,
	type: WalletType,
}).omit({
	id: true,
	createdAt: true,
	updatedAt: true,
});

export type SelectWalletSchema = z.infer<typeof SelectWalletSchema>;
export type InsertWalletSchema = z.infer<typeof InsertWalletSchema>;

// User Schemas
export const SelectUserSchema = createSelectSchema(users, {
	id: UserId,
	name: z.string().nullish(),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
	purrlons: z.coerce.number(),
})
	.omit({
		hashedPassword: true,
	})
	.extend({
		catUserAffections: z.array(SelectCatUserAffectionSchema),
		wallets: z.array(SelectWalletSchema),
	});
export const InsertUserSchema = createInsertSchema(users, {})
	.omit({
		id: true,
		purrlons: true,
		emailVerified: true,
		hashedPassword: true,
		normalizedEmail: true,
		createdAt: true,
		createdBy: true,
		updatedAt: true,
		updatedBy: true,
	})
	.extend({
		password: z.string().min(8).optional(),
		role: UserRole.optional(),
	});

// Add a new schema for password change
export const ChangePasswordSchema = z.object({
	currentPassword: z.string(),
	newPassword: z.string().min(8),
});
export type ChangePasswordSchema = z.infer<typeof ChangePasswordSchema>;

export type SelectUserSchema = z.infer<typeof SelectUserSchema>;
export type InsertUserSchema = z.infer<typeof InsertUserSchema>;

// EmailVerificationCode Schemas
export const SelectEmailVerificationCodeSchema = createSelectSchema(
	emailVerificationCodes,
	{
		userId: UserId,
		expiresAt: z.coerce.date(),
	},
);
export const InsertEmailVerificationCodeSchema = createInsertSchema(
	emailVerificationCodes,
).omit({
	id: true,
});
export type SelectEmailVerificationCodeSchema = z.infer<
	typeof SelectEmailVerificationCodeSchema
>;
export type InsertEmailVerificationCodeSchema = z.infer<
	typeof InsertEmailVerificationCodeSchema
>;

/**
 * Session Schemas
 */
export const SelectSessionSchema = createSelectSchema(sessions, {
	userId: UserId,
	expiresAt: z.coerce.date(),
});
export const InsertSessionSchema = createInsertSchema(sessions).omit({
	id: true,
});
export type SelectSessionSchema = z.infer<typeof SelectUserSchema>;
export type InsertSessionSchema = z.infer<typeof InsertUserSchema>;

/**
 * Item Schemas
 */
export const SelectItemSchema = createSelectSchema(items, {
	id: ItemId,
	price: z.coerce.number(),
	effect: z.coerce.number(),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
});

export const InsertItemSchema = createInsertSchema(items, {
	id: ItemId,
	price: z.coerce.number(),
	effect: z.coerce.number(),
}).omit({
	id: true,
	createdAt: true,
	updatedAt: true,
});

/**
 * UserItem Schemas
 */
export const SelectUserItemSchema = createSelectSchema(userItems, {
	id: UserItemId,
	userId: UserId,
	itemId: ItemId,
	quantity: z.coerce.number(),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
}).extend({
	item: SelectItemSchema,
});

export const SelectInteractionSchema = createSelectSchema(
	CatInteractionsTable,
	{
		id: CatInteractionId,
		catId: CatId,
		userId: UserId,
		userItemId: UserItemId.nullable(),
		cost: z.coerce.number(),
	},
);

export const InsertInteractionSchema = createInsertSchema(
	CatInteractionsTable,
	{
		catId: CatId,
		userId: UserId,
		userItemId: UserItemId.optional(),
		cost: z.coerce.number(),
		status: InteractionStatus,
		outputEmotion: z.array(z.enum(CAT_EMOTIONS)).nullable(),
	},
).omit({
	id: true,
	userId: true,
	createdAt: true,
	catId: true,
});

export const InsertCatUserAffectionSchema = createInsertSchema(
	CatUserAffectionsTable,
).omit({
	id: true,
	updatedAt: true,
});

export const SelectCatActivitySchema = createSelectSchema(CatActivitiesTable, {
	id: CatActivityId,
	catId: CatId,
	activity: CatActivity,
	location: CatSpot,
	startTime: z.coerce.date(),
});

export const InsertCatActivitySchema = createInsertSchema(CatActivitiesTable, {
	id: CatActivityId,
	catId: CatId,
}).omit({
	id: true,
	startTime: true,
});

// Schemas
export const SelectCatSchema = createSelectSchema(CatTable, {
	id: CatId,
	name: z.string(),
	hunger: z.coerce.number(),
	happiness: z.coerce.number(),
	energy: z.coerce.number(),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
}).extend({
	memories: z.array(SelectMemorySchema),
	interactions: z.array(SelectInteractionSchema),
	thoughts: z.array(SelectThoughtSchema),
	userAffections: z.array(SelectCatUserAffectionSchema),
	activities: z.array(SelectCatActivitySchema),
});

// Add transaction schemas
export const SelectTransactionSchema = createSelectSchema(transactions, {
	userId: UserId,
	amount: z.coerce.number(),
	createdAt: z.coerce.date(),
	interactionId: CatInteractionId.nullish(),
	itemId: ItemId.nullish(),
}).extend({
	item: SelectItemSchema.nullish(),
});

export const InsertTransactionSchema = createInsertSchema(transactions).omit({
	id: true,
	createdAt: true,
});

export const InsertUserItemSchema = createInsertSchema(userItems, {
	id: UserItemId,
	userId: UserId,
	itemId: ItemId,
}).omit({
	id: true,
	createdAt: true,
	updatedAt: true,
});

// Export types
export type SelectItemSchema = z.infer<typeof SelectItemSchema>;
export type InsertItemSchema = z.infer<typeof InsertItemSchema>;
export type SelectUserItemSchema = z.infer<typeof SelectUserItemSchema>;
export type InsertUserItemSchema = z.infer<typeof InsertUserItemSchema>;

// Export new types
export type SelectTransactionSchema = z.infer<typeof SelectTransactionSchema>;
export type InsertTransactionSchema = z.infer<typeof InsertTransactionSchema>;

export type SelectCatSchema = z.infer<typeof SelectCatSchema>;
export type InsertCatSchema = z.infer<typeof InsertCatSchema>;
export type SelectMemorySchema = z.infer<typeof SelectMemorySchema>;
export type InsertMemorySchema = z.infer<typeof InsertMemorySchema>;
export type SelectInteractionSchema = z.infer<typeof SelectInteractionSchema>;
export type InsertInteractionSchema = z.infer<typeof InsertInteractionSchema>;
export type SelectThoughtSchema = z.infer<typeof SelectThoughtSchema>;
export type InsertThoughtSchema = z.infer<typeof InsertThoughtSchema>;
export type SelectCatUserAffectionSchema = z.infer<
	typeof SelectCatUserAffectionSchema
>;
export type InsertCatUserAffectionSchema = z.infer<
	typeof InsertCatUserAffectionSchema
>;
export type SelectCatActivitySchema = z.infer<typeof SelectCatActivitySchema>;
export type InsertCatActivitySchema = z.infer<typeof InsertCatActivitySchema>;
