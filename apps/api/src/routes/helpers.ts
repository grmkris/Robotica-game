import type { ContextVariables } from "@/types";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

export const validateUser = (c: Context<{ Variables: ContextVariables }>) => {
	const user = c.get("user");
	if (!user) {
		throw new HTTPException(401, { message: "Unauthorized" });
	}
	return user;
};

export function createJsonSchema<T extends z.ZodType>(schema: T) {
	return {
		content: {
			"application/json": {
				schema,
			},
		},
		required: true,
	} as const;
}

export const commonHeaderSchema = z.object({
	cookie: z.string().optional().openapi({
		description: "Session cookie",
		example: "session=abc123",
	}),
});
