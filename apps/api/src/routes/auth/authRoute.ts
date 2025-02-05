import { registerApp } from "./registerRoute";

import { users, wallets } from "@/db/schema/users.db";
import { z } from "zod";

import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { getCookie, setCookie } from "hono/cookie";

import type { ContextVariables } from "@/types";

import { InsertUserSchema, SelectUserSchema } from "@/db/schema/schemas.db";
import { and, eq, or } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { verifyHash } from "./authService";

import { env } from "@/env";
import { hashPassword } from "@/routes/auth/authService";
import { CAT_SERVICE_URLS, type WalletChainId } from "cat-sdk";
import { createPublicClient, http } from "viem";
import { base, baseSepolia } from "viem/chains";
import { generateSiweNonce, parseSiweMessage } from "viem/siwe";

export const loginSchema = z.object({
	email: z.string().email().trim().toLowerCase(),
	password: z.string(),
});
export const logoutSchema = z.object({
	redirect: z.coerce.boolean().optional().default(false),
});
export const siweNonce = new OpenAPIHono<{
	Variables: ContextVariables;
}>().openapi(
	createRoute({
		method: "get",
		path: "siwe/nonce",
		tags: ["Auth"],
		summary: "Get SIWE nonce",
		responses: {
			200: {
				description: "Success",
				content: {
					"application/json": {
						schema: z.object({
							nonce: z.string(),
						}),
					},
				},
			},
		},
	}),
	async (c) => {
		const nonce = generateSiweNonce();
		return c.json({ nonce });
	},
);

const siweMessageSchema = z.object({
	message: z.string().min(1),
	signature: z.string(),
});

export const siweVerify = new OpenAPIHono<{
	Variables: ContextVariables;
}>().openapi(
	createRoute({
		method: "post",
		path: "siwe/verify",
		tags: ["Auth"],
		summary: "Verify SIWE message",
		request: {
			body: {
				content: {
					"application/json": {
						schema: siweMessageSchema,
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
							ok: z.boolean(),
						}),
					},
				},
			},
		},
	}),
	async (c) => {
		const { message, signature } = c.req.valid("json");
		const db = c.get("db");
		const lucia = c.get("lucia");
		const logger = c.get("logger");

		try {
			const currentUser = c.get("user");
			logger.info({ msg: "Parsing SIWE message", message });
			const siweMessage = parseSiweMessage(message);
			const address = siweMessage.address;
			const chainId = siweMessage.chainId as WalletChainId;
			const network = chainId === base.id ? base : baseSepolia;
			if (!chainId)
				throw new HTTPException(401, { message: "Invalid signature" });
			if (!address)
				throw new HTTPException(401, { message: "Invalid signature" });
			logger.info({ msg: "Parsed SIWE message", address, chainId });
			const publicClient = createPublicClient({
				chain: network,
				transport: http(),
			});

			logger.info({ msg: "Verifying SIWE message", address, chainId });

			const isValid = await publicClient.verifySiweMessage({
				message,
				signature: signature as `0x${string}`,
			});

			if (!isValid) {
				logger.warn({
					msg: "SIWE signature verification failed",
					address,
					chainId,
				});
				throw new HTTPException(401, { message: "Invalid signature" });
			}

			// if user is already logged in, that means they are adding a new wallet to their account
			if (currentUser) {
				logger.info({
					msg: "Adding wallet to existing user",
					userId: currentUser.id,
					address,
					chainId,
				});

				const userWallet = await db.query.wallets.findFirst({
					where: and(
						eq(wallets.userId, currentUser.id),
						eq(wallets.address, address),
					),
				});

				if (userWallet) {
					logger.info({
						msg: "Wallet already exists for user",
						userId: currentUser.id,
						walletId: userWallet.id,
					});
					return c.json({ ok: true });
				}

				// if user is already logged in, but the wallet belongs to a different user, we need to throw an error
				const otherUserWallet = await db.query.wallets.findFirst({
					where: and(
						eq(wallets.address, address),
						eq(wallets.chainId, chainId),
					),
				});

				if (otherUserWallet) {
					logger.error({
						msg: "Wallet already registered",
						userId: otherUserWallet.userId,
						walletId: otherUserWallet.id,
					});
					throw new Error("Wallet already registered");
				}

				// Wrap wallet creation in transaction
				const newWallet = await db.transaction(async (tx) => {
					const result = await tx
						.insert(wallets)
						.values({
							userId: currentUser.id,
							address,
							chainId,
							type: "ETHEREUM",
						})
						.returning();

					if (!result || result.length === 0) {
						throw new Error("Failed to add wallet");
					}

					return result[0];
				});

				logger.info({
					msg: "Successfully added wallet to user",
					userId: currentUser.id,
					walletId: newWallet.id,
				});
				return c.json({ ok: true });
			}

			// if user is not logged in, we need to check if they have an account
			logger.info({
				msg: "Checking for existing wallet",
				address: siweMessage.address,
				chainId: siweMessage.chainId,
			});
			const walletUser = await db.query.wallets.findFirst({
				where: and(eq(wallets.address, address), eq(wallets.chainId, chainId)),
				with: {
					user: true,
				},
			});

			if (walletUser?.user?.id) {
				logger.info({
					msg: "Found existing user for wallet",
					userId: walletUser.user.id,
					walletId: walletUser.id,
				});

				const session = await lucia.createSession(walletUser.user.id, {
					username: walletUser.user.username,
				});

				const sessionCookie = lucia.createSessionCookie(session.id);
				setCookie(c, sessionCookie.name, sessionCookie.value, {
					...sessionCookie.attributes,
					sameSite: "Lax",
				});

				return c.json({ ok: true });
			}

			// If no existing wallet found, create new user and wallet
			const { user: newUser, wallet: newWallet } = await db.transaction(
				async (tx) => {
					const [user] = await tx
						.insert(users)
						.values([
							{
								username: siweMessage.address as string,
								normalizedEmail: null,
								emailVerified: false,
								purrlons: 100,
								createdBy: "SYSTEM",
								updatedBy: "SYSTEM",
							},
						])
						.returning();

					logger.info({ msg: "Created new user", userId: user.id });

					const [wallet] = await tx
						.insert(wallets)
						.values({
							userId: user.id,
							address,
							chainId,
							type: "ETHEREUM",
						})
						.returning();

					return { user, wallet };
				},
			);

			logger.info({
				msg: "Created new wallet",
				walletId: newWallet.id,
				userId: newUser.id,
			});

			const session = await lucia.createSession(newUser.id, {
				username: newUser.username,
			});

			const sessionCookie = lucia.createSessionCookie(session.id);
			setCookie(c, sessionCookie.name, session.id, {
				...sessionCookie.attributes,
				sameSite: "Lax",
				secure: process.env.NODE_ENV === "production",
				httpOnly: true,
				path: "/",
				domain: CAT_SERVICE_URLS[env.ENVIRONMENT].cookieDomain,
				maxAge: 60 * 60 * 24 * 7, // 7 days
			});

			logger.info({
				msg: "Successfully created session for new user",
				userId: newUser.id,
				sessionId: session.id,
			});

			return c.json({ ok: true });
		} catch (error) {
			logger.error({
				msg: "SIWE verification error",
				error: error instanceof Error ? error.message : "Unknown error",
				stack: error instanceof Error ? error.stack : undefined,
			});

			if (error instanceof HTTPException) {
				throw error;
			}

			throw new HTTPException(500, {
				message: "Failed to verify SIWE message",
			});
		}
	},
);

export const login = new OpenAPIHono<{ Variables: ContextVariables }>().openapi(
	createRoute({
		method: "post",
		path: "login",
		tags: ["Auth"],
		summary: "Authorize user",
		request: {
			body: {
				description: "Request body",
				content: {
					"application/json": {
						schema: loginSchema.openapi("Login"),
					},
				},
				required: true,
			},
		},
		responses: {
			200: {
				description: "Success",
			},
		},
	}),
	async (c) => {
		const { email, password } = c.req.valid("json");
		const db = c.get("db");
		const lucia = c.get("lucia");
		const logger = c.get("logger");

		const normalizedEmail = email.toUpperCase();

		logger.info("Normalized email:", normalizedEmail);
		const existingUser = await db.query.users.findFirst({
			where: and(
				eq(users.emailVerified, true),
				or(
					eq(users.normalizedEmail, normalizedEmail),
					eq(users.username, email),
				),
			),
		});

		logger.info("Existing user:", existingUser);
		if (!existingUser) {
			logger.warn({
				msg: "Failed login attempt - user not found",
				email: normalizedEmail,
				ip: c.req.header("x-forwarded-for") || c.req.header("x-real-ip"),
			});
			throw new HTTPException(400, {
				message: "Invalid credentials",
			});
		}

		const validPassword = await verifyHash(
			existingUser.hashedPassword,
			password,
		);
		if (!validPassword) {
			logger.warn({
				msg: "Failed login attempt - invalid password",
				userId: existingUser.id,
				ip: c.req.header("x-forwarded-for") || c.req.header("x-real-ip"),
			});
			throw new HTTPException(400, {
				message: "Invalid credentials",
			});
		}

		const session = await lucia.createSession(existingUser.id, {
			username: existingUser.username,
		});
		const sessionCookie = lucia.createSessionCookie(session.id);
		setCookie(c, sessionCookie.name, session.id, {
			...sessionCookie.attributes,
			sameSite: "Lax",
			secure: process.env.NODE_ENV === "production",
			httpOnly: true,
			path: "/",
			domain: CAT_SERVICE_URLS[env.ENVIRONMENT].cookieDomain,
			maxAge: 60 * 60 * 24 * 7, // 7 days
		});

		return c.json({});
	},
);

export const logout = new OpenAPIHono<{
	Variables: ContextVariables;
}>().openapi(
	createRoute({
		method: "get",
		path: "logout",
		tags: ["Auth"],
		summary: "Logout",
		request: {
			query: logoutSchema.openapi("Logout"),
		},
		responses: {
			200: {
				description: "Success",
			},
		},
	}),
	async (c) => {
		const { redirect } = c.req.valid("query");
		const lucia = c.get("lucia");
		const sessionId = getCookie(c, lucia.sessionCookieName);

		if (!sessionId) {
			if (redirect) {
				return c.redirect("/");
			}
			return c.json({});
		}

		await lucia.invalidateSession(sessionId);
		setCookie(c, lucia.sessionCookieName, "", {
			expires: new Date(0),
			sameSite: "Strict",
		});
		if (redirect) {
			return c.redirect("/");
		}
		return c.json({});
	},
);

export const me = new OpenAPIHono<{ Variables: ContextVariables }>().openapi(
	createRoute({
		method: "get",
		path: "me",
		tags: ["Auth"],
		summary: "Get current user information",
		responses: {
			200: {
				description: "Success",
				content: {
					"application/json": {
						schema: SelectUserSchema,
					},
				},
			},
			401: {
				description: "Unauthorized",
			},
		},
	}),
	async (c) => {
		const user = c.get("user");
		const db = c.get("db");

		if (!user) {
			throw new HTTPException(401, { message: "Unauthorized" });
		}

		const userdb = await db.query.users.findFirst({
			where: eq(users.id, user.id),
			with: {
				catUserAffections: true,
				wallets: true,
			},
		});

		if (!userdb) {
			throw new HTTPException(401, { message: "Unauthorized" });
		}

		return c.json(userdb, { status: 200 });
	},
);

export const updateMe = new OpenAPIHono<{
	Variables: ContextVariables;
}>().openapi(
	createRoute({
		method: "put",
		path: "me",
		tags: ["Auth"],
		summary: "Update current user information",
		request: {
			body: {
				content: {
					"application/json": {
						schema: InsertUserSchema.partial(),
					},
				},
			},
		},
		responses: {
			200: {
				description: "User updated successfully",
				content: {
					"application/json": {
						schema: SelectUserSchema,
					},
				},
			},
			401: {
				description: "Unauthorized",
			},
		},
	}),
	async (c) => {
		const user = c.get("user");
		const db = c.get("db");

		if (!user) {
			throw new HTTPException(401, { message: "Unauthorized" });
		}

		const updateData = c.req.valid("json");

		const updatedUser = await db
			.update(users)
			.set({
				...updateData,
				updatedAt: new Date(),
				updatedBy: user.id,
			})
			.where(eq(users.id, user.id))
			.returning();

		if (!updatedUser || updatedUser.length === 0) {
			throw new HTTPException(500, { message: "Failed to update user" });
		}

		return c.json(updatedUser[0], { status: 200 });
	},
);

export const changePasswordRoute = new OpenAPIHono<{
	Variables: ContextVariables;
}>().openapi(
	createRoute({
		method: "post",
		path: "change-password",
		tags: ["Auth"],
		summary: "Change Password",
		request: {
			body: {
				description: "Request body",
				content: {
					"application/json": {
						schema: z.object({
							currentPassword: z.string(),
							newPassword: z.string(),
						}),
					},
				},
			},
		},
		responses: {
			200: {
				description: "Password changed successfully",
				content: {
					"application/json": {
						schema: z.object({
							message: z.literal("Password changed successfully"),
						}),
					},
				},
			},
		},
	}),
	async (c) => {
		const { currentPassword, newPassword } = c.req.valid("json");
		const db = c.get("db");
		const user = c.get("user");

		if (!user) {
			throw new HTTPException(401, { message: "Unauthorized" });
		}

		const existingUser = await db.query.users.findFirst({
			where: eq(users.id, user.id),
		});

		if (!existingUser) {
			throw new HTTPException(404, { message: "User not found" });
		}

		const validPassword = await verifyHash(
			existingUser.hashedPassword,
			currentPassword,
		);
		if (!validPassword) {
			throw new HTTPException(400, {
				message: "Current password is incorrect",
			});
		}

		const hashedPassword = await hashPassword(newPassword);
		await db
			.update(users)
			.set({
				hashedPassword,
				updatedBy: user.id,
				updatedAt: new Date(),
			})
			.where(eq(users.id, user.id));

		return c.json({ message: "Password changed successfully" as const });
	},
);

export const authApp = new OpenAPIHono<{ Variables: ContextVariables }>()
	.route("/", registerApp)
	.route("/", login)
	.route("/", logout)
	.route("/", me)
	.route("/", updateMe)
	.route("/", changePasswordRoute)
	.route("/", siweNonce)
	.route("/", siweVerify);
