import { customAlphabet } from "nanoid";
import { z } from "zod";

const prefixes = {
  robot: "rob",
  battle: "bat",
  round: "rnd",
  stats: "stats",
} as const;

type Prefix = (typeof prefixes)[keyof typeof prefixes];
export type Entity = keyof typeof prefixes;

type PrefixToId = {
  [K in keyof typeof prefixes]: `${(typeof prefixes)[K]}${string}`;
};

// Zod schemas
const createIdSchema = <T extends Prefix>(prefix: T) =>
  z.custom<`${T}${string}`>(
    (val): val is `${T}${string}` =>
      typeof val === "string" && val.startsWith(prefix)
  );

export const RobotId = createIdSchema(prefixes.robot);
export type RobotId = z.infer<typeof RobotId>;
export const BattleId = createIdSchema(prefixes.battle);
export type BattleId = z.infer<typeof BattleId>;
export const RoundId = createIdSchema(prefixes.round);
export type RoundId = z.infer<typeof RoundId>;
export const StatsId = createIdSchema(prefixes.stats);
export type StatsId = z.infer<typeof StatsId>;

export function generateId<T extends keyof typeof prefixes>(
  prefix: T,
  { length = 12, separator = "_" }: { length?: number; separator?: string } = {}
): PrefixToId[T] {
  const id = customAlphabet(
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
    length
  )();
  return `${prefixes[prefix]}${separator}${id}` as PrefixToId[T];
}
