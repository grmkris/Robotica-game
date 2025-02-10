import type { db } from "@/db/db";
import {
  BattleRobotsTable,
  BattleRoomTable,
  BattleTable
} from "@/db/schema/robotBattle.db";
import { validateUser } from "@/routes/helpers";
import { resolveBattle } from "@/routes/robotBattle/robotBattler";
import type { ContextVariables } from "@/types";
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import type { Logger } from "cat-logger";
import { eq, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { BattleId, RobotId, RoomId, UserId, generateId } from "robot-sdk";


const JoinRoomSchema = z.object({
  roomId: RoomId,
  robotId: RobotId,
});

const BattleRoomSchema = z.object({
  id: RoomId,
  createdBy: UserId,
  robot1Id: RobotId,
  createdAt: z.string(),
  expiresAt: z.string(),
});

// Helper function to start battle
async function startBattle(
  robots: RobotId[],
  db: db,
  logger: Logger
) {
  const battleId = generateId("battle");
  const [battle] = await db
    .insert(BattleTable)
    .values({
      id: battleId,
      status: "IN_PROGRESS",
      startedAt: new Date(),
    })
    .returning();

  // Insert battle robots
  await db.insert(BattleRobotsTable).values(robots.map((robot) => ({
    battleId,
    robotId: robot,
    id: generateId("battleRobot"),
    createdAt: new Date(),
  })));

  // Start battle simulation in background
  void resolveBattle({ battleId, db, logger });

  return battle;
}

// Create Battle Room Route
export const createBattleRoomRoute = new OpenAPIHono<{
  Variables: ContextVariables;
}>().openapi(
  createRoute({
    method: "post",
    path: "/create",
    tags: ["BattleRoom"],
    summary: "Create a battle room",
    request: {
      body: {
        content: {
          "application/json": {
            schema: z.object({
              robotId: RobotId,
            }),
          },
        },
      },
    },
    responses: {
      200: {
        description: "Room created successfully",
        content: {
          "application/json": {
            schema: z.object({
              roomId: RoomId,
              battleId: BattleId.nullable(),
            }),
          },
        },
      },
    },
  }),
  async (c) => {
    const { robotId } = c.req.valid("json");
    const user = validateUser(c);
    const db = c.get("db");

    try {
      const existingRoom = await db
        .select()
        .from(BattleRoomTable)
        .where(
          sql`robot1_id = ${robotId} AND status = 'WAITING' AND expires_at > NOW()`
        )
        .limit(1);

      if (existingRoom.length > 0) {
        throw new HTTPException(400, {
          message: "You already have an active battle room with this robot",
        });
      }

      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      const [room] = await db
        .insert(BattleRoomTable)
        .values({
          createdBy: user.id,
          robot1Id: robotId as `rob_${string}`,
          status: "WAITING",
          expiresAt,
        })
        .returning();

      return c.json({ roomId: room.id, battleId: null });
    } catch (error) {
      if (error instanceof HTTPException) throw error;
      throw new HTTPException(500, { message: "Failed to create battle room" });
    }
  }
);

// List Battle Rooms Route
export const listBattleRoomsRoute = new OpenAPIHono<{
  Variables: ContextVariables;
}>().openapi(
  createRoute({
    method: "get",
    path: "/list",
    tags: ["BattleRoom"],
    summary: "List available battle rooms",
    responses: {
      200: {
        description: "List of available rooms",
        content: {
          "application/json": {
            schema: z.array(BattleRoomSchema),
          },
        },
      },
    },
  }),
  async (c) => {
    const db = c.get("db");

    try {
      const rooms = await db.query.BattleRoomTable.findMany({
        where: eq(BattleRoomTable.status, "WAITING"),
      });

      return c.json(rooms);
    } catch (error) {
      throw new HTTPException(500, { message: "Failed to list battle rooms" });
    }
  }
);

// Join Battle Room Route
export const joinBattleRoomRoute = new OpenAPIHono<{
  Variables: ContextVariables;
}>().openapi(
  createRoute({
    method: "post",
    path: "/join",
    tags: ["BattleRoom"],
    summary: "Join a battle room",
    request: {
      body: {
        content: {
          "application/json": {
            schema: JoinRoomSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Successfully joined room",
        content: {
          "application/json": {
            schema: z.object({
              status: z.literal("READY"),
              battleId: z.string(),
            }),
          },
        },
      },
    },
  }),
  async (c) => {
    const { roomId, robotId } = c.req.valid("json");
    const db = c.get("db");
    const logger = c.get("logger");

    try {
      const [room] = await db
        .update(BattleRoomTable)
        .set({
          robot2Id: robotId as `rob_${string}`,
          status: "READY" as const,
        })
        .where(sql`id = ${roomId} AND status = 'WAITING'`)
        .returning();

      if (!room) {
        throw new HTTPException(404, { message: "Room not found or not available" });
      }

      if (!room.robot1Id || !room.robot2Id) {
        throw new HTTPException(400, { message: "Invalid room configuration" });
      }

      const battle = await startBattle(
        [room.robot1Id, room.robot2Id],
        db,
        logger
      );

      await db
        .update(BattleRoomTable)
        .set({
          battleId: battle.id,
          status: "IN_PROGRESS" as const,
        })
        .where(sql`id = ${roomId}`);

      return c.json({
        status: "READY" as const,
        battleId: battle.id,
      });
    } catch (error) {
      if (error instanceof HTTPException) throw error;
      throw new HTTPException(500, { message: "Failed to join battle room" });
    }
  }
);

// Combine all routes
export const battleRoomRoutes = new OpenAPIHono<{ Variables: ContextVariables }>()
  .route("/", createBattleRoomRoute)
  .route("/", listBattleRoomsRoute)
  .route("/", joinBattleRoomRoute);
