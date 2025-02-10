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
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import {
	ItemId,
	UserId,
	UserItemId,
} from "robot-sdk";
import { z } from "zod";

export const SelectWalletSchema = createSelectSchema(wallets, {
	userId: UserId,
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
});

export const InsertWalletSchema = createInsertSchema(wallets, {
	userId: UserId,
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