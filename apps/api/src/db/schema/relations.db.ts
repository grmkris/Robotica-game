import { relations } from "drizzle-orm";
import {
  RobotTable,
  BattleTable,
  BattleRoundsTable,
  UserBattleStatsTable,
} from "./robotBattle.db";
import {
  emailVerificationCodes,
  items,
  sessions,
  transactions,
  userItems,
  users,
  wallets,
} from "./users.db";

// Relations for Robot Battle tables
export const robotRelations = relations(RobotTable, ({ many, one }) => ({
  battlesAsRobot1: many(BattleTable, { relationName: "robot1Battles" }),
  battlesAsRobot2: many(BattleTable, { relationName: "robot2Battles" }),
  wonBattles: many(BattleTable, { relationName: "battleWinner" }),
  creator: one(users, {
    fields: [RobotTable.createdBy],
    references: [users.id],
  }),
}));

export const battleRelations = relations(BattleTable, ({ one, many }) => ({
  robot1: one(RobotTable, {
    fields: [BattleTable.robot1Id],
    references: [RobotTable.id],
    relationName: "robot1Battles",
  }),
  robot2: one(RobotTable, {
    fields: [BattleTable.robot2Id],
    references: [RobotTable.id],
    relationName: "robot2Battles",
  }),
  winner: one(RobotTable, {
    fields: [BattleTable.winnerId],
    references: [RobotTable.id],
    relationName: "battleWinner",
  }),
  rounds: many(BattleRoundsTable),
}));

export const battleRoundsRelations = relations(
  BattleRoundsTable,
  ({ one }) => ({
    battle: one(BattleTable, {
      fields: [BattleRoundsTable.battleId],
      references: [BattleTable.id],
    }),
    roundWinner: one(RobotTable, {
      fields: [BattleRoundsTable.roundWinnerId],
      references: [RobotTable.id],
    }),
  })
);

export const userBattleStatsRelations = relations(
  UserBattleStatsTable,
  ({ one }) => ({
    user: one(users, {
      fields: [UserBattleStatsTable.userId],
      references: [users.id],
    }),
  })
);

// Relations from users.db.ts
export const emailVerificationCodesRelations = relations(
  emailVerificationCodes,
  ({ one }) => ({
    users: one(users, {
      fields: [emailVerificationCodes.userId],
      references: [users.id],
    }),
  })
);

export const sessionsRelations = relations(sessions, ({ one }) => ({
  users: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  createdUsers: many(users, { relationName: "createdUsers" }),
  updatedUsers: many(users, { relationName: "updatedUsers" }),
  createdBy: one(users, {
    fields: [users.createdBy],
    references: [users.id],
    relationName: "createdUsers",
  }),
  updatedBy: one(users, {
    fields: [users.updatedBy],
    references: [users.id],
    relationName: "updatedUsers",
  }),
  emailVerificationCodes: many(emailVerificationCodes),
  sessions: many(sessions),
  userItems: many(userItems),
  transactions: many(transactions),
  wallets: many(wallets),
  createdRobots: many(RobotTable),
  battleStats: one(UserBattleStatsTable),
}));

export const itemsRelations = relations(items, ({ many }) => ({
  userItems: many(userItems),
}));

export const userItemsRelations = relations(userItems, ({ one }) => ({
  user: one(users, {
    fields: [userItems.userId],
    references: [users.id],
  }),
  item: one(items, {
    fields: [userItems.itemId],
    references: [items.id],
  }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  item: one(items, {
    fields: [transactions.itemId],
    references: [items.id],
  }),
}));

export const walletsRelations = relations(wallets, ({ one }) => ({
  user: one(users, {
    fields: [wallets.userId],
    references: [users.id],
  }),
}));
