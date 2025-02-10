import { validateUser } from "@/auth";
import type { db } from "@/db/db";
import {
  BattleRoomTable,
  BattleRoundsTable,
  BattleTable,
} from "@/db/schema/robotBattle.db";
import { simulateBattle } from "@/routes/robotBattle/robotBattleRoute";
import type { ContextVariables } from "@/types";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import type { Logger } from "cat-logger";
import { eq, sql } from "drizzle-orm";
import { type RobotId, generateId } from "robot-sdk";
import { z } from "zod";

// Create a Zod schema for RobotId validation
const RobotIdSchema = z.string().regex(/^rob_/);

// Add this function near the top of the file after imports
async function startBattle(
  robot1Id: RobotId,
  robot2Id: RobotId,
  db: db,
  logger: Logger
) {
  const [battle] = await db
    .insert(BattleTable)
    .values({
      id: generateId("battle"),
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
                battleId: z.string().nullable(),
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

      const existingRoom = await db
        .select()
        .from(BattleRoomTable)
        .where(
          sql`robot1_id = ${robotId} AND status = 'WAITING' AND expires_at > NOW()`
        )
        .limit(1);

      if (existingRoom.length > 0) {
        throw new Error(
          "You already have an active battle room with this robot"
        );
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
      let battleId: string; // Add this to store the battle ID

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

        battleId = battle.id; // Store the battle ID

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

      return c.json({
        status: "READY" as const,
        battleId, // Use the stored battle ID
      });
    }
  )
  .get("/events/:roomId", async (c) => {
    const roomId = c.req.param("roomId");
    console.log("SSE connection established for room:", roomId);

    // Helper function to encode SSE message
    const encoder = new TextEncoder();
    const encodeMessage = (data: unknown) => {
      return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
    };

    return new Response(
      new ReadableStream({
        async start(controller) {
          const db = c.get("db");

          // Initial room state
          const room = await db
            .select()
            .from(BattleRoomTable)
            .where(sql`id = ${roomId}`)
            .limit(1);

          if (!room.length) {
            console.log("Room not found:", roomId);
            controller.close();
            return;
          }

          console.log("Sending initial room state:", room[0]);
          controller.enqueue(encodeMessage({ room: room[0] }));

          // Set up polling for updates
          const interval = setInterval(async () => {
            const updatedRoom = await db
              .select()
              .from(BattleRoomTable)
              .where(sql`id = ${roomId}`)
              .limit(1);

            if (!updatedRoom.length) {
              console.log("Room no longer exists:", roomId);
              clearInterval(interval);
              controller.close();
              return;
            }

            console.log("Sending room update:", updatedRoom[0]);
            controller.enqueue(encodeMessage({ room: updatedRoom[0] }));

            if (updatedRoom[0].battleId) {
              console.log("Battle started, closing SSE connection");
              clearInterval(interval);
              controller.close();
            }
          }, 1000);

          // Clean up on disconnect
          c.req.raw.signal.addEventListener("abort", () => {
            console.log("Client disconnected, cleaning up");
            clearInterval(interval);
            controller.close();
          });
        },
      }),
      {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      }
    );
  })
  .get("/battle-status", async (c) => {
    const battleId = c.req.query("battleId");
    if (!battleId?.startsWith("bat_")) {
      throw new Error("Invalid battle ID format");
    }

    const db = c.get("db");
    const typedBattleId = battleId as `bat_${string}`;

    const battle = await db
      .select({
        battle: BattleTable,
        rounds: BattleRoundsTable,
      })
      .from(BattleTable)
      .leftJoin(
        BattleRoundsTable,
        eq(BattleTable.id, BattleRoundsTable.battleId)
      )
      .where(eq(BattleTable.id, typedBattleId))
      .execute();

    if (!battle.length) {
      throw new Error("Battle not found");
    }

    // Format the response
    const formattedBattle = {
      ...battle[0].battle,
      rounds: battle.map((b) => b.rounds).filter(Boolean),
    };

    return c.json(formattedBattle);
  });
