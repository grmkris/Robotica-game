import { DrizzlePostgreSQLAdapter } from "@lucia-auth/adapter-drizzle";
import { Lucia } from "lucia";

import type { db } from "@/db/db";
import type { SelectUserSchema } from "@/db/schema/schemas.db";
import { env } from "@/env";

import { sessions, users } from "@/db/schema/users.db";

import type { UserId as UserIdType } from "cat-sdk";
import type { Context } from "hono";
import type { ContextVariables } from "@/types";

export const createLucia = (props: { db: db }) => {
  const adapter = new DrizzlePostgreSQLAdapter(props.db, sessions, users);

  const lucia = new Lucia(adapter, {
    sessionCookie: {
      name: "misha-cat-ai-session",
      attributes: {
        secure: env.NODE_ENV === "production",
      },
    },
    getUserAttributes: (attributes) => {
      const returnData = {
        id: attributes.id,
        email: attributes.email,
      };
      return returnData;
    },
  });

  return lucia;
};

declare module "lucia" {
  interface Register {
    Lucia: ReturnType<typeof createLucia>;
    UserId: UserIdType;
    DatabaseUserAttributes: SelectUserSchema;
    DatabaseSessionAttributes: {
      username: string;
    };
  }
}

export function validateUser(c: Context<{ Variables: ContextVariables }>) {
  const user = c.get("user");
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}
