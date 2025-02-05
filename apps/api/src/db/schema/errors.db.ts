import { type Entity, ErrorId, generateId } from "cat-sdk";
import { sql } from "drizzle-orm";
import { jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Error logs section
export const ERROR_TYPES = [
	"interaction-error",
	"interaction-validation-error",
	"thought-generation-error",
] as const;

export const ErrorType = z.enum(ERROR_TYPES);
export type ErrorType = z.infer<typeof ErrorType>;

export const errorLogs = pgTable("error_logs", {
	id: varchar("id", { length: 255 })
		.primaryKey()
		.$defaultFn(() => generateId("error"))
		.$type<ErrorId>(),
	entityType: varchar("entity_type", { length: 50 }).notNull().$type<Entity>(),
	entityId: varchar("entity_id", { length: 255 }).notNull(),
	error: jsonb("error").notNull(),
	errorType: text("error_type", { enum: ERROR_TYPES })
		.notNull()
		.$type<ErrorType>(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull(),
});

export const SelectErrorLogSchema = createSelectSchema(errorLogs, {
	id: ErrorId,
	createdAt: z.coerce.date(),
});

export const InsertErrorLogSchema = createInsertSchema(errorLogs).omit({
	id: true,
	createdAt: true,
});

export type SelectErrorLog = z.infer<typeof SelectErrorLogSchema>;
export type InsertErrorLog = z.infer<typeof InsertErrorLogSchema>;
