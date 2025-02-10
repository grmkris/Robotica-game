import * as schema from "@/db/schema/schema.db";
import * as robotSchema from "@/db/schema/robotBattle.db";
import { env } from "@/env";
import { sql } from "drizzle-orm";
import { type PostgresJsDatabase, drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

let db: PostgresJsDatabase<typeof schema & typeof robotSchema>;
let pgClient: postgres.Sql | null = null;

export function initDb(
	testDb?: PostgresJsDatabase<typeof schema & typeof robotSchema>,
) {
	if (testDb) {
		db = testDb;
		return db;
	}

	const dbUrl = env.DATABASE_URL;
	if (!dbUrl) throw new Error("DATABASE_URL is not set");

	pgClient = postgres(dbUrl, { prepare: true });
	db = drizzle(pgClient, { schema: { ...schema, ...robotSchema } });
	return db;
}

export function getDb() {
	if (!db) {
		db = initDb();
	}
	return db;
}

export async function createTestDb(testName: string) {
	const dbName = `test_db_${testName}_${Date.now()}`.toLowerCase();
	const dbUrl = env.DATABASE_URL;
	if (!dbUrl) throw new Error("DATABASE_URL is not set");

	const pg = postgres(dbUrl);
	const adminDrizzle = drizzle(pg, {
		schema: { ...schema, ...robotSchema },
		logger: true,
	});

	try {
		await adminDrizzle.execute(sql`CREATE DATABASE ${sql.raw(dbName)}`);

		const newDbUrl = dbUrl.replace(/\/[^/]+$/, `/${dbName}`);
		const newPg = postgres(newDbUrl);
		const testDb = drizzle(newPg, {
			schema: { ...schema, ...robotSchema },
			logger: false,
		});

		await migrate(testDb, { migrationsFolder: "drizzle" });

		// Initialize the global db with the test database
		initDb(testDb);

		return testDb;
	} catch (error) {
		console.error("Error creating test database:", error);
		throw error;
	} finally {
		await pg.end();
	}
}

export type db = typeof db;

export function getPgClient() {
	return pgClient;
}
