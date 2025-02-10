import { UserId } from "robot-sdk";
import {
	generateEmailVerificationCode,
	sendVerificationCode,
} from "./authService";

import { emailVerificationCodes, users } from "@/db/schema/users.db";
import type { ContextVariables } from "@/types";
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { setCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import { isWithinExpirationDate } from "oslo";
import { hashPassword } from "./authService";

export const verifySchema = z.object({
	email: z.string().email(),
	confirmationCode: z.string(),
	password: z.string(),
});

export const sendRegistrationCodeSchema = z.object({
	email: z.string().email(),
	agree: z.boolean(),
});

export const verify = new OpenAPIHono<{
	Variables: ContextVariables;
}>().openapi(
	createRoute({
		method: "post",
		path: "register/verify",
		tags: ["Auth"],
		summary: "Verifies the confirmation code and stores the password hash.",
		request: {
			body: {
				description: "Request body",
				content: {
					"application/json": {
						schema: verifySchema.openapi("Verify", {
							example: {
								email: "hey@example.com",
								confirmationCode: "42424242",
								password: "11eeb60bbef14eb5b8990c02cdb11851",
							},
						}),
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
		const { email, confirmationCode, password } = c.req.valid("json");
		const db = c.get("db");

		const normalizedEmail = email.toUpperCase();

		const existingUser = await db.query.users.findFirst({
			where: eq(users.normalizedEmail, normalizedEmail),
			with: {
				emailVerificationCodes: true,
			},
		});

		const error = new HTTPException(400, {
			message:
				"Either the user does not exist, the email is already verified or there is no existing user secret.",
		});

		if (
			!existingUser ||
			existingUser.emailVerified ||
			existingUser.emailVerificationCodes.length <= 0
		) {
			throw error;
		}

		const code = existingUser.emailVerificationCodes.at(0);
		if (
			(code?.expiresAt && !isWithinExpirationDate(code?.expiresAt)) ||
			code?.code !== confirmationCode
		) {
			throw error;
		}

		const hashedPassword = await hashPassword(password);
		await db.transaction(async (ctx) => {
			await ctx
				.update(users)
				.set({
					emailVerified: true,
					hashedPassword,
				})
				.where(eq(users.id, existingUser.id));

			await ctx
				.delete(emailVerificationCodes)
				.where(eq(emailVerificationCodes.id, code.id));
		});

		const lucia = c.get("lucia");
		const session = await lucia.createSession(existingUser.id, {
			username: existingUser.username,
		});
		const sessionCookie = lucia.createSessionCookie(session.id);
		setCookie(c, sessionCookie.name, sessionCookie.value, {
			...sessionCookie.attributes,
			sameSite: "Strict",
		});

		return c.json({});
	},
);

export const sendRegistrationCode = new OpenAPIHono<{
	Variables: ContextVariables;
}>().openapi(
	createRoute({
		method: "post",
		path: "register/send-registration-code",
		tags: ["Auth"],
		summary: "Emails the user a temporary registration code",
		request: {
			body: {
				description: "Request body",
				content: {
					"application/json": {
						schema: sendRegistrationCodeSchema.openapi("SendRegistrationCode", {
							example: {
								email: "hey@example.com",
								agree: true,
							},
						}),
					},
				},
				required: true,
			},
		},
		responses: {
			200: {
				description: "Success",
				content: {
					"application/json": {
						schema: z.object({
							id: UserId,
						}),
					},
				},
			},
		},
	}),
	async (c) => {
		const { agree, email } = c.req.valid("json");
		const db = c.get("db");

		if (!agree) {
			throw new HTTPException(400, {
				message: "You must agree to the terms to continue.",
			});
		}

		const normalizedEmail = email.toUpperCase();

		const existingUser = await db.query.users.findFirst({
			where: eq(users.normalizedEmail, normalizedEmail),
		});

		if (existingUser?.emailVerified) {
			return c.json({
				id: existingUser.id,
			});
		}

		if (existingUser && !existingUser.emailVerified) {
			const code = await generateEmailVerificationCode(existingUser.id);
			const success = await sendVerificationCode(email, code);
			if (!success) {
				throw new HTTPException(500, {
					message: "Failed to send email.",
				});
			}
			return c.json({ id: existingUser.id });
		}

		// Simplify the transaction to only create a user
		const result = await db.transaction(async (tx) => {
			const user = await tx
				.insert(users)
				.values({
					username: email,
					email: email,
					normalizedEmail,
					purrlons: 0,
					createdBy: "SYSTEM",
					updatedBy: "SYSTEM",
				})
				.returning({ insertedUserId: users.id });

			if (!user[0]?.insertedUserId)
				throw new Error("Failed to generate user ID.");

			return { userId: user[0].insertedUserId };
		});

		const code = await generateEmailVerificationCode(result.userId);
		const success = await sendVerificationCode(email, code);
		if (!success) {
			throw new HTTPException(500, {
				message: "Failed to send email.",
			});
		}
		return c.json({ id: result.userId });
	},
);

export const usernameRegisterSchema = z.object({
	username: z.string().min(3).max(30),
	password: z.string().min(8),
});

export const registerWithUsername = new OpenAPIHono<{
	Variables: ContextVariables;
}>().openapi(
	createRoute({
		method: "post",
		path: "register/username",
		tags: ["Auth"],
		summary: "Register a new user with username and password",
		request: {
			body: {
				description: "Request body",
				content: {
					"application/json": {
						schema: usernameRegisterSchema.openapi("RegisterWithUsername", {
							example: {
								username: "coolcat123",
								password: "securepassword123",
							},
						}),
					},
				},
				required: true,
			},
		},
		responses: {
			200: {
				description: "Success",
				content: {
					"application/json": {
						schema: z.object({
							id: UserId,
						}),
					},
				},
			},
		},
	}),
	async (c) => {
		const { username, password } = c.req.valid("json");
		const db = c.get("db");

		// Check if username already exists
		const existingUser = await db.query.users.findFirst({
			where: eq(users.username, username),
		});

		if (existingUser) {
			throw new HTTPException(400, {
				message: "Username already taken",
			});
		}

		const hashedPassword = await hashPassword(password);

		// Create new user
		const result = await db.transaction(async (tx) => {
			const user = await tx
				.insert(users)
				.values({
					username,
					hashedPassword,
					purrlons: 100,
					createdBy: "SYSTEM",
					updatedBy: "SYSTEM",
					emailVerified: true, // Since we're not using email
				})
				.returning({ insertedUserId: users.id });

			if (!user[0]?.insertedUserId) {
				throw new Error("Failed to generate user ID.");
			}

			return { userId: user[0].insertedUserId };
		});

		// Create session
		const lucia = c.get("lucia");
		const session = await lucia.createSession(result.userId, {
			username,
		});
		const sessionCookie = lucia.createSessionCookie(session.id);
		setCookie(c, sessionCookie.name, sessionCookie.value, {
			...sessionCookie.attributes,
			sameSite: "Strict",
		});

		return c.json({ id: result.userId });
	},
);

export const registerApp = new OpenAPIHono<{ Variables: ContextVariables }>()
	.route("/", sendRegistrationCode)
	.route("/", verify)
	.route("/", registerWithUsername);
