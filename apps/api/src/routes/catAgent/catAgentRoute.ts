import {
	CatInteractionsTable,
	CatTable,
	CatUserAffectionsTable,
} from "@/db/schema/catAgent.db";
import {
	SelectCatSchema,
	SelectCatUserAffectionSchema,
	SelectInteractionSchema,
	SelectItemSchema,
	SelectTransactionSchema,
	SelectUserItemSchema,
	SelectUserSchema,
	SelectWalletSchema,
} from "@/db/schema/schemas.db";
import { items, transactions, userItems, users } from "@/db/schema/users.db";
import { loadCatAgentState } from "@/routes/catAgent/chat-processor/handleInteraction";
import { validateUser } from "@/routes/helpers";
import type { ContextVariables } from "@/types";
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import {
	CatId,
	CatInteractionId,
	InteractionType,
	ItemId,
	UserId,
	UserItemId,
	generateId,
} from "cat-sdk";
import { and, desc, eq, gt, ne, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

// Define the app with routes
export const getCatStateRoute = new OpenAPIHono<{
	Variables: ContextVariables;
}>().openapi(
	createRoute({
		method: "get",
		path: "get-state",
		tags: ["CatAgent"],
		summary: "Get the current state of the cat agent",
		request: {
			query: z.object({
				catId: CatId,
			}),
		},
		responses: {
			200: {
				description: "Success",
				content: {
					"application/json": {
						schema: SelectCatSchema,
					},
				},
			},
		},
	}),
	async (c) => {
		const { catId } = c.req.valid("query");
		const db = c.get("db");
		const logger = c.get("logger");
		const result = await loadCatAgentState({ db, catId, logger });

		if (!result) {
			throw new HTTPException(404, {
				message: "Cat state not found",
			});
		}

		return c.json(result);
	},
);

export const interactWithCatRoute = new OpenAPIHono<{
	Variables: ContextVariables;
}>().openapi(
	createRoute({
		method: "post",
		path: "interact",
		tags: ["CatAgent"],
		summary: "Interact with the cat agent",
		request: {
			body: {
				description: "Interaction details",
				content: {
					"application/json": {
						schema: z.object({
							catId: CatId,
							interaction: z.object({
								type: InteractionType,
								input: z.string().optional(),
								userItemId: UserItemId.optional(),
							}),
						}),
					},
				},
			},
		},
		responses: {
			200: {
				description: "Success",
				content: {
					"application/json": {
						schema: z.object({
							interactionId: CatInteractionId,
						}),
					},
				},
			},
		},
	}),
	async (c) => {
		const { catId, interaction } = c.req.valid("json");
		const user = validateUser(c);
		const queue = c.get("queueServices");
		const logger = c.get("logger");
		try {
			// Add job to queue
			const interactionId = generateId("interaction");
			logger.info({
				msg: "Adding interaction to queue",
				interactionId,
				catId,
				userId: user.id,
				type: interaction.type,
				input: interaction.input,
				userItemId: interaction.userItemId,
			});
			await queue.interactionQueue.addJob({
				interactionId,
				catId,
				userId: user.id,
				type: interaction.type,
				input: interaction.input,
				userItemId: interaction.userItemId,
			});

			return c.json({
				interactionId,
			});
		} catch (error) {
			throw new HTTPException(500, {
				message:
					error instanceof Error
						? error.message
						: "Failed to queue interaction",
			});
		}
	},
);

export const getUserCatStateRoute = new OpenAPIHono<{
	Variables: ContextVariables;
}>().openapi(
	createRoute({
		method: "get",
		path: "get-user-state",
		tags: ["CatAgent"],
		summary: "Get the current state of the cat agent for the user",
		request: {
			query: z.object({
				catId: CatId,
			}),
		},
		responses: {
			200: {
				description: "Success",
				content: {
					"application/json": {
						schema: SelectCatSchema,
					},
				},
			},
			404: {
				description: "Cat state not found",
			},
		},
	}),
	async (c) => {
		const { catId } = c.req.valid("query");
		const db = c.get("db");

		const result = await db.query.CatTable.findFirst({
			where: eq(CatTable.id, catId),
		});

		if (!result) {
			throw new HTTPException(404, {
				message: "Cat state not found",
			});
		}

		return c.json(result);
	},
);

// New route to list all cats
export const listAllCatsRoute = new OpenAPIHono<{
	Variables: ContextVariables;
}>().openapi(
	createRoute({
		method: "get",
		path: "list-all-cats",
		tags: ["CatAgent"],
		summary: "List all available cats",
		responses: {
			200: {
				description: "Success",
				content: {
					"application/json": {
						schema: z.array(
							SelectCatSchema.omit({
								memories: true,
								interactions: true,
								thoughts: true,
								userAffections: true,
								activities: true,
							}),
						),
					},
				},
			},
		},
	}),
	async (c) => {
		const db = c.get("db");
		const result = await db.query.CatTable.findMany();
		return c.json(result);
	},
);

// Modified getAllItemsRoute
export const getAllItemsRoute = new OpenAPIHono<{
	Variables: ContextVariables;
}>().openapi(
	createRoute({
		method: "get",
		path: "items",
		tags: ["CatAgent"],
		summary: "Get all available items",
		responses: {
			200: {
				description: "Success",
				content: {
					"application/json": {
						schema: z.array(SelectItemSchema),
					},
				},
			},
		},
	}),
	async (c) => {
		const db = c.get("db");
		const allItems = await db.query.items.findMany();
		return c.json(allItems);
	},
);

// Modified buyItemRoute to handle purrlon transaction
export const buyItemRoute = new OpenAPIHono<{
	Variables: ContextVariables;
}>().openapi(
	createRoute({
		method: "post",
		path: "buy-item",
		tags: ["CatAgent"],
		summary: "Buy an item for the user",
		request: {
			body: {
				content: {
					"application/json": {
						schema: z.object({
							itemId: ItemId,
							quantity: z.coerce.number().positive().default(1),
						}),
					},
				},
			},
		},
		responses: {
			200: {
				description: "Success",
				content: {
					"application/json": {
						schema: z.object({
							success: z.boolean(),
							message: z.string(),
						}),
					},
				},
			},
			400: {
				description: "Bad Request",
			},
			404: {
				description: "Item not found",
			},
		},
	}),
	async (c) => {
		const user = validateUser(c);
		const { itemId, quantity } = c.req.valid("json");
		const db = c.get("db");

		try {
			// Check if the item exists and get its price
			const item = await db.query.items.findFirst({
				where: eq(items.id, itemId),
			});

			if (!item) {
				throw new Error("Item not found");
			}

			const totalCost = item.price * quantity;

			// Get user's current balance
			const currentUser = await db.query.users.findFirst({
				where: eq(users.id, user.id),
			});

			if (!currentUser) {
				throw new Error("User not found");
			}

			if (currentUser.purrlons < totalCost) {
				throw new Error(
					`Insufficient purrlons. Required: ${totalCost.toString()}, Available: ${currentUser.purrlons.toString()}`,
				);
			}

			// Handle the purchase in a transaction
			await db.transaction(async (tx) => {
				// Update user's purrlon balance
				await tx
					.update(users)
					.set({
						purrlons: currentUser.purrlons - totalCost,
					})
					.where(eq(users.id, user.id));

				// Record the transaction
				await tx.insert(transactions).values({
					userId: user.id,
					amount: -totalCost,
					type: "SPENT",
					category: "SHOP",
					itemId: itemId,
					description: `Purchased ${quantity}x ${item.name} for ${totalCost.toString()} purrlons`,
				});

				// Update or create user item
				const existingUserItem = await tx.query.userItems.findFirst({
					where: and(
						eq(userItems.userId, user.id),
						eq(userItems.itemId, itemId),
					),
				});

				if (existingUserItem) {
					await tx
						.update(userItems)
						.set({ quantity: existingUserItem.quantity + quantity })
						.where(eq(userItems.id, existingUserItem.id));
				} else {
					await tx.insert(userItems).values({
						userId: user.id,
						itemId: itemId,
						quantity,
					});
				}
			});

			return c.json({
				success: true,
				message: `Item purchased successfully for ${totalCost.toString()} purrlons`,
			});
		} catch (error) {
			if (error instanceof Error) {
				throw new HTTPException(400, { message: error.message });
			}
			throw error;
		}
	},
);

// Modified getUserItemsRoute
export const getUserItemsRoute = new OpenAPIHono<{
	Variables: ContextVariables;
}>().openapi(
	createRoute({
		method: "get",
		path: "user-items",
		tags: ["CatAgent"],
		summary: "Get items owned by the user",
		responses: {
			200: {
				description: "Success",
				content: {
					"application/json": {
						schema: z.array(SelectUserItemSchema),
					},
				},
			},
		},
	}),
	async (c) => {
		const user = validateUser(c);
		const db = c.get("db");
		const userItemsWithDetails = await db.query.userItems.findMany({
			with: {
				item: true,
			},
			where: and(
				eq(userItems.userId, user.id),
				// Only return items with quantity > 0
				gt(userItems.quantity, 0),
			),
		});

		return c.json(userItemsWithDetails);
	},
);

// Add new route to get user's transaction history
export const getTransactionHistoryRoute = new OpenAPIHono<{
	Variables: ContextVariables;
}>().openapi(
	createRoute({
		method: "get",
		path: "transactions",
		tags: ["CatAgent"],
		summary: "Get user's transaction history",
		responses: {
			200: {
				description: "Success",
				content: {
					"application/json": {
						schema: z.array(SelectTransactionSchema),
					},
				},
			},
		},
	}),
	async (c) => {
		const user = validateUser(c);
		const db = c.get("db");

		const userTransactions = await db.query.transactions.findMany({
			where: eq(transactions.userId, user.id),
			orderBy: (transactions, { desc }) => [desc(transactions.createdAt)],
			with: {
				item: true,
			},
		});

		return c.json(userTransactions);
	},
);

// Add this new route before the catAgentApp definition
export const getCatInteractionsRoute = new OpenAPIHono<{
	Variables: ContextVariables;
}>().openapi(
	createRoute({
		method: "get",
		path: "interactions",
		tags: ["CatAgent"],
		summary: "Get paginated cat interactions",
		request: {
			query: z.object({
				catId: CatId,
				page: z.coerce.number().min(1).default(1),
				pageSize: z.coerce.number().min(1).max(50).default(20),
				userId: UserId.optional(),
			}),
		},
		responses: {
			200: {
				description: "Success",
				content: {
					"application/json": {
						schema: z.object({
							interactions: z.array(
								SelectInteractionSchema.extend({
									user: SelectUserSchema.extend({
										catUserAffections: SelectCatUserAffectionSchema.array(),
										wallets: SelectWalletSchema.array(),
									}),

									userItem: SelectUserItemSchema.extend({
										item: SelectItemSchema,
									}).nullable(),
								}),
							),
							totalPages: z.number(),
							currentPage: z.number(),
						}),
					},
				},
			},
		},
	}),
	async (c) => {
		const { catId, page, pageSize, userId } = c.req.valid("query");
		const db = c.get("db");

		const result = await db.query.CatInteractionsTable.findMany({
			with: {
				user: {
					with: {
						catUserAffections: {
							where: eq(CatUserAffectionsTable.catId, catId),
						},
						wallets: true,
					},
				},
				userItem: {
					with: {
						item: true,
					},
				},
			},
			where: and(
				eq(CatInteractionsTable.catId, catId),
				userId ? eq(CatInteractionsTable.userId, userId) : undefined,
				ne(CatInteractionsTable.status, "FAILED"),
			),
			orderBy: (interactions, { desc }) => [desc(interactions.createdAt)],
			offset: (page - 1) * pageSize,
			limit: pageSize,
		});

		return c.json({
			interactions: result,
			totalPages: Math.ceil(result.length / pageSize),
			currentPage: page,
		});
	},
);

// Add this new route before the catAgentApp definition
export const getMishaLeaderboardRoute = new OpenAPIHono<{
	Variables: ContextVariables;
}>().openapi(
	createRoute({
		method: "get",
		path: "misha-leaderboard",
		tags: ["CatAgent"],
		summary: "Get leaderboard of users ranked by Misha's affection",
		request: {
			query: z.object({
				catId: CatId,
			}),
		},
		responses: {
			200: {
				description: "Success",
				content: {
					"application/json": {
						schema: z.array(
							z.object({
								userId: UserId,
								username: z.string(),
								affectionLevel: z.number(),
								rank: z.number(),
							}),
						),
					},
				},
			},
		},
	}),
	async (c) => {
		const db = c.get("db");
		const { catId } = c.req.valid("query");

		const leaderboard = await db
			.select({
				userId: users.id,
				username: users.username,
				affectionLevel: sql<number>`CAST(${CatUserAffectionsTable.affection} AS float)`,
				rank: sql<number>`ROW_NUMBER() OVER (ORDER BY ${CatUserAffectionsTable.affection} DESC)`,
			})
			.from(CatUserAffectionsTable)
			.innerJoin(users, eq(users.id, CatUserAffectionsTable.userId))
			.where(eq(CatUserAffectionsTable.catId, catId))
			.orderBy(desc(CatUserAffectionsTable.affection));

		return c.json(leaderboard);
	},
);

// Update the catAgentApp to include the new route
export const catAgentApp = new OpenAPIHono<{ Variables: ContextVariables }>()
	.route("/", getCatStateRoute)
	.route("/", interactWithCatRoute)
	.route("/", getUserCatStateRoute)
	.route("/", listAllCatsRoute)
	.route("/", getAllItemsRoute)
	.route("/", buyItemRoute)
	.route("/", getUserItemsRoute)
	.route("/", getTransactionHistoryRoute)
	.route("/", getCatInteractionsRoute)
	.route("/", getMishaLeaderboardRoute);
