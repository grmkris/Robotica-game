import { createTestDb, type db } from "@/db/db";
import { CatInteractionsTable, CatTable } from "@/db/schema/catAgent.db";
import { users } from "@/db/schema/users.db";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { generateId } from "cat-sdk";
import { eq } from "drizzle-orm";
import { RedisMemoryServer } from "redis-memory-server";
import {
	type InteractionQueueService,
	createInteractionQueueService,
} from "./interactionQueue";

describe("Interaction Queue", () => {
	let testDb: db;
	let redisServer: RedisMemoryServer;
	let queueService: InteractionQueueService;
	const userId = generateId("user");
	const catId = generateId("cat");

	beforeAll(async () => {
		// Setup Redis memory server
		redisServer = new RedisMemoryServer();
		const host = await redisServer.getHost();
		const port = await redisServer.getPort();

		// Create queue service with test Redis
		queueService = createInteractionQueueService({
			connection: { host, port },
			queueName: `test-queue-${Date.now()}`,
		});

		// Setup test database
		testDb = await createTestDb(`interactionQueue-${Date.now()}`);

		// Create test user
		await testDb.insert(users).values({
			id: userId,
			email: "test@test.com",
			normalizedEmail: "test@test.com",
			username: "test",
			purrlons: 100,
		});

		// Create test cat
		await testDb.insert(CatTable).values({
			id: catId,
			name: "Test Cat",
			hunger: 50,
			happiness: 50,
			energy: 50,
			description: "Test cat",
			createdAt: new Date(),
			updatedAt: new Date(),
		});
	});

	afterAll(async () => {
		await queueService.close();
		await redisServer.stop();
	});

	it("should process a successful interaction", async () => {
		const interactionId = generateId("interaction");
		const jobData = {
			interactionId,
			catId,
			userId,
			type: "CHAT" as const,
			input: "Hello cat!",
		};

		// Add job to queue and wait for it to complete
		await queueService.addJob(jobData);

		// Give the job some time to process
		await new Promise((resolve) => setTimeout(resolve, 50000));

		// Verify interaction was recorded
		const interaction = await testDb.query.CatInteractionsTable.findFirst({
			where: eq(CatInteractionsTable.id, interactionId),
		});

		expect(interaction).toBeDefined();
		expect(interaction?.status).toBe("COMPLETED");

		// Verify cat state was updated
		const updatedCat = await testDb.query.CatTable.findFirst({
			where: eq(CatTable.id, catId),
		});

		if (!updatedCat) {
			throw new Error("Cat not found");
		}

		expect(updatedCat).toBeDefined();
		expect(updatedCat?.updatedAt.getTime()).toBeGreaterThan(
			updatedCat?.createdAt.getTime(),
		);
	}, 300000);

	// Add other tests using the actual queue...
});
