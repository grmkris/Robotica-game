import type { createLucia } from "@/auth";
import type { db } from "@/db/db";
import type { Logger } from "cat-logger";
import type { Session, User } from "lucia";

export type ContextVariables = {
	db: db;
	user: User | null;
	session: Session | null;
	lucia: ReturnType<typeof createLucia>;
	logger: Logger;
};
