import { OpenAPIHono } from "@hono/zod-openapi";
import { createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import type { ContextVariables } from "@/types";
import {
  BattleRoomTable,
  BattleTable,
  BattleRoundsTable,
} from "@/db/schema/robotBattle.db";
import { generateId } from "@/types/robotBattle.types";
import { sql, eq } from "drizzle-orm";
import { validateUser } from "@/auth";
import { simulateBattle } from "./robotBattle/robotBattleRoute";

// Create a Zod schema for RobotId validation
const RobotIdSchema = z.string().regex(/^rob_/);

// Add this function near the top of the file after imports
async function startBattle(
  robot1Id: `rob_${string}`,
  robot2Id: `rob_${string}`,
  db: any,
  logger: any
) {
  const [battle] = await db
    .insert(BattleTable)
    .values({
      id: generateId("battle") as `bat_${string}`,
      robot1Id,
      robot2Id,
      status: "IN_PROGRESS",
      startedAt: new Date(),
    })
    .returning();

  // Start battle simulation in background
  void simulateBattle(battle.id, robot1Id, robot2Id, db, logger);

  return battle;
}

export const battleRoomRoutes = new OpenAPIHono<{
  Variables: ContextVariables;
}>()
  .openapi(
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
                robotId: z.string().regex(/^rob_/),
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
                roomId: z.string(),
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

      return c.json({ roomId: room.id });
    }
  )
  .openapi(
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
              schema: z.array(
                z.object({
                  id: z.string(),
                  createdBy: z.string(),
                  robot1Id: RobotIdSchema,
                  createdAt: z.string(),
                  expiresAt: z.string(),
                })
              ),
            },
          },
        },
      },
    }),
    async (c) => {
      const db = c.get("db");

      const rooms = await db
        .select()
        .from(BattleRoomTable)
        .where(sql`status = 'WAITING' AND expires_at > NOW()`);

      return c.json(rooms);
    }
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/join",
      tags: ["BattleRoom"],
      summary: "Join a battle room",
      request: {
        body: {
          content: {
            "application/json": {
              schema: z.object({
                roomId: z.string(),
                robotId: RobotIdSchema,
              }),
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
              }),
            },
          },
        },
      },
    }),
    async (c) => {
      const { roomId, robotId } = c.req.valid("json");
      const db = c.get("db");

      const [room] = await db
        .update(BattleRoomTable)
        .set({
          robot2Id: robotId as `rob_${string}`,
          status: "READY" as const,
        })
        .where(sql`id = ${roomId} AND status = 'WAITING'`)
        .returning();

      if (!room) {
        throw new Error("Room not found or not available");
      }

      // Start the battle automatically
      try {
        if (!room.robot2Id) {
          throw new Error("Robot 2 not found");
        }
        if (!room.robot1Id) {
          throw new Error("Robot 1 not found");
        }
        const battle = await startBattle(
          room.robot1Id,
          room.robot2Id,
          db,
          c.get("logger")
        );

        // Update room with battle ID
        await db
          .update(BattleRoomTable)
          .set({
            battleId: battle.id,
            status: "IN_PROGRESS" as const,
          })
          .where(sql`id = ${roomId}`);
      } catch (error) {
        console.error("Failed to start battle:", error);
        throw new Error("Failed to start battle");
      }

      return c.json({ status: "READY" as const });
    }
  )
  .get("/events/:roomId", async (c) => {
    const roomId = c.req.param("roomId");

    // Set up SSE headers
    c.header("Content-Type", "text/event-stream");
    c.header("Cache-Control", "no-cache");
    c.header("Connection", "keep-alive");

    const stream = new ReadableStream({
      async start(controller) {
        const db = c.get("db");

        // Initial room state with battle info
        const room = await db
          .select({
            room: BattleRoomTable,
            battle: BattleTable,
            rounds: BattleRoundsTable,
          })
          .from(BattleRoomTable)
          .leftJoin(BattleTable, eq(BattleRoomTable.battleId, BattleTable.id))
          .leftJoin(
            BattleRoundsTable,
            eq(BattleTable.id, BattleRoundsTable.battleId)
          )
          .where(sql`room.id = ${roomId}`)
          .limit(1);

        if (!room.length) {
          controller.close();
          return;
        }

        // Send initial state
        controller.enqueue(`data: ${JSON.stringify(room[0])}\n\n`);

        // Set up polling for updates
        const interval = setInterval(async () => {
          const updatedRoom = await db
            .select({
              room: BattleRoomTable,
              battle: BattleTable,
              rounds: BattleRoundsTable,
            })
            .from(BattleRoomTable)
            .leftJoin(BattleTable, eq(BattleRoomTable.battleId, BattleTable.id))
            .leftJoin(
              BattleRoundsTable,
              eq(BattleTable.id, BattleRoundsTable.battleId)
            )
            .where(sql`room.id = ${roomId}`)
            .limit(1);

          if (
            !updatedRoom.length ||
            updatedRoom[0].room.status === "COMPLETED" ||
            updatedRoom[0].battle?.status === "COMPLETED"
          ) {
            clearInterval(interval);
            controller.close();
            return;
          }

          controller.enqueue(`data: ${JSON.stringify(updatedRoom[0])}\n\n`);
        }, 1000);

        // Clean up on disconnect
        c.req.raw.signal.addEventListener("abort", () => {
          clearInterval(interval);
          controller.close();
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  });
