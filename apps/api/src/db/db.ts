import { CatTable } from "@/db/schema/catAgent.db";
import * as schema from "@/db/schema/schema.db";
import type { InsertItemSchema } from "@/db/schema/schemas.db";
import { type ItemType, items } from "@/db/schema/users.db";
import { env } from "@/env";
import type { Logger } from "cat-logger";
import { eq, sql } from "drizzle-orm";
import { type PostgresJsDatabase, drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

let db: PostgresJsDatabase<typeof schema>;
let pgClient: postgres.Sql | null = null;

export function initDb(testDb?: PostgresJsDatabase<typeof schema>) {
	if (testDb) {
		db = testDb;
		return db;
	}

	const dbUrl = env.DATABASE_URL;
	if (!dbUrl) throw new Error("DATABASE_URL is not set");

	pgClient = postgres(dbUrl, { prepare: true });
	db = drizzle(pgClient, { schema });
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
	const adminDrizzle = drizzle(pg, { schema, logger: true });

	try {
		await adminDrizzle.execute(sql`CREATE DATABASE ${sql.raw(dbName)}`);

		const newDbUrl = dbUrl.replace(/\/[^/]+$/, `/${dbName}`);
		const newPg = postgres(newDbUrl);
		const testDb = drizzle(newPg, { schema, logger: false });

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

export const seedData = async (props: {
	logger: Logger;
}) => {
	const { logger } = props;
	const db = getDb();
	// Seed default cat
	const defaultCat = {
		name: "Misha",
		hunger: 50,
		happiness: 50,
		energy: 50,
	};

	const existingCat = await db.query.CatTable.findFirst();

	if (!existingCat) {
		await db.insert(CatTable).values({
			...defaultCat,
			description: "The default cat",
		});
		logger.info(`Default cat "${defaultCat.name}" seeded successfully`);
	} else {
		logger.info(
			`Default cat "${defaultCat.name}" already exists, skipping insertion`,
		);
	}

	// Seed items
	const itemsData: InsertItemSchema[] = [
		{
			name: "Bell",
			description: "A shiny bell toy",
			type: "TOY" as ItemType,
			imageUrl: "/items/bell.jpg",
			price: 10,
			effect: 5,
		},
		{
			name: "Box Game",
			description: "A fun box game",
			type: "TOY" as ItemType,
			imageUrl: "/items/box_game.jpg",
			price: 15,
			effect: 7,
		},
		{
			name: "Box",
			description: "A simple cardboard box",
			type: "FURNITURE" as ItemType,
			imageUrl: "/items/box.jpg",
			price: 5,
			effect: 3,
		},
		{
			name: "Chicken",
			description: "Delicious chicken treat",
			type: "FOOD" as ItemType,
			imageUrl: "/items/chicken.jpg",
			price: 20,
			effect: 10,
		},
		{
			name: "Climber",
			description: "A cat climbing structure",
			type: "FURNITURE" as ItemType,
			imageUrl: "/items/climber.jpg",
			price: 50,
			effect: 15,
		},
		{
			name: "Cotton Ball",
			description: "Soft cotton ball toy",
			type: "TOY" as ItemType,
			imageUrl: "/items/cotton_ball.jpg",
			price: 8,
			effect: 4,
		},
		{
			name: "Golden Fish",
			description: "A rare golden fish treat",
			type: "FOOD" as ItemType,
			imageUrl: "/items/golden_fish.jpg",
			price: 30,
			effect: 12,
		},
		{
			name: "Laser Pointer",
			description: "Interactive laser toy",
			type: "TOY" as ItemType,
			imageUrl: "/items/laser.jpg",
			price: 25,
			effect: 8,
		},
		{
			name: "Magical Feather",
			description: "Enchanted feather toy",
			type: "TOY" as ItemType,
			imageUrl: "/items/magical_feather.jpg",
			price: 18,
			effect: 6,
		},
		{
			name: "Magical Mouse",
			description: "Animated mouse toy",
			type: "TOY" as ItemType,
			imageUrl: "/items/magical_mouse.jpg",
			price: 22,
			effect: 7,
		},
		{
			name: "Milk",
			description: "Fresh cat milk",
			type: "FOOD" as ItemType,
			imageUrl: "/items/milk.jpg",
			price: 12,
			effect: 6,
		},
		{
			name: "Pillow",
			description: "Soft cat pillow",
			type: "FURNITURE" as ItemType,
			imageUrl: "/items/pillow.jpg",
			price: 35,
			effect: 10,
		},
		{
			name: "Rainbow Fish",
			description: "Colorful fish treat",
			type: "FOOD" as ItemType,
			imageUrl: "/items/rainbow_fish.jpg",
			price: 25,
			effect: 9,
		},
		{
			name: "Tuna",
			description: "Tasty tuna treat",
			type: "FOOD" as ItemType,
			imageUrl: "/items/tuna.jpg",
			price: 15,
			effect: 8,
		},
		{
			name: "Window Perch",
			description: "Window-mounted cat perch",
			type: "FURNITURE" as ItemType,
			imageUrl: "/items/window.jpg",
			price: 40,
			effect: 12,
		},
	];

	for (const item of itemsData) {
		const existingItem = await db
			.select()
			.from(items)
			.where(eq(items.name, item.name))
			.limit(1);
		if (existingItem.length === 0) {
			await db.insert(items).values(item);
			logger.info(`Item "${item.name}" seeded successfully`);
		} else {
			logger.info(`Item "${item.name}" already exists, skipping insertion`);
		}
	}

	// insert into cat_state

	logger.info("Seed data process completed");
};

export function getPgClient() {
	return pgClient;
}
