import { createLucia } from "@/auth";
import { getDb } from "@/db/db";
import { env } from "@/env";
import { logger } from "@/logger";
import type { ContextVariables } from "@/types";
import { CAT_SERVICE_URLS } from "cat-sdk";
import { getCookie, setCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { getQueueServices } from "./queue/queueSingleton";

export const authMiddleware = createMiddleware<{ Variables: ContextVariables }>(
	async (c, next) => {
		const childLogger = logger.child({
			requestId: c.get("requestId"),
		});
		c.set("logger", childLogger);
		const db = getDb();
		const queueServices = getQueueServices();

		c.set("db", db);
		c.set("queueServices", queueServices);

		// Add CORS headers first
		const origin = CAT_SERVICE_URLS[env.ENVIRONMENT].frontend;

		c.res.headers.set("Access-Control-Allow-Credentials", "true");
		c.res.headers.set("Access-Control-Allow-Origin", origin);

		// Add additional CORS headers for preflight requests
		c.res.headers.set(
			"Access-Control-Allow-Methods",
			"GET, POST, PUT, DELETE, OPTIONS",
		);
		c.res.headers.set(
			"Access-Control-Allow-Headers",
			"Content-Type, Authorization",
		);

		// Handle preflight requests
		if (c.req.method === "OPTIONS") {
			return new Response(null, { status: 204 });
		}

		const lucia = createLucia({ db });
		c.set("lucia", lucia);

		const sessionId = getCookie(c, lucia.sessionCookieName);

		try {
			if (!sessionId) {
				c.set("user", null);
				c.set("session", null);
				return next();
			}

			const { session, user } = await lucia.validateSession(sessionId);

			if (session?.fresh) {
				setCookie(c, lucia.sessionCookieName, session.id, {
					httpOnly: true,
					secure: process.env.NODE_ENV === "production",
					sameSite: "Lax",
					path: "/",
					domain: CAT_SERVICE_URLS[env.ENVIRONMENT].frontend,
					maxAge: 60 * 60 * 24 * 30, // 30 days
				});
			}

			if (!session) {
				// Clear the invalid cookie
				setCookie(c, lucia.sessionCookieName, "", {
					httpOnly: true,
					secure: process.env.NODE_ENV === "production",
					sameSite: "Lax",
					path: "/",
					domain: CAT_SERVICE_URLS[env.ENVIRONMENT].frontend,
					maxAge: 0,
				});
				c.set("user", null);
				c.set("session", null);
				return next();
			}

			c.set("user", user);
			c.set("session", session);
		} catch (error) {
			logger.error("Auth middleware error:", error);
			c.set("user", null);
			c.set("session", null);
		}

		return next();
	},
);
