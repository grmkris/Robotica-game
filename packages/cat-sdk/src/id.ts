import { customAlphabet } from "nanoid";
import { z } from "zod";

const prefixes = {
  user: "usr",
  error: "err",
  cat: "cat",
  memory: "mem",
  interaction: "int",
  thought: "thk",
  catUserAffection: "cua",
  catActivity: "catActivity",
  item: "itm",
  userItem: "uitm",
  purrlonTxn: "ptxn",
  wallet: "wlt",
} as const;

// tsk, usr, cst, itm, ord, oit, nte, nor, err
type Prefix = (typeof prefixes)[keyof typeof prefixes];
export type Entity = keyof typeof prefixes;

type PrefixToId = {
  [K in keyof typeof prefixes]: `${(typeof prefixes)[K]}${string}`;
};

// Zod schemas
const createIdSchema = <T extends Prefix>(prefix: T) =>
  z.custom<`${T}${string}`>(
    (val): val is `${T}${string}` =>
      typeof val === "string" && val.startsWith(prefix),
  );

export const UserId = createIdSchema(prefixes.user);
export type UserId = z.infer<typeof UserId>;
export const ErrorId = createIdSchema(prefixes.error);
export type ErrorId = z.infer<typeof ErrorId>;
export const CatId = createIdSchema(prefixes.cat);
export type CatId = z.infer<typeof CatId>;
export const CatMemoryId = createIdSchema(prefixes.memory);
export type CatMemoryId = z.infer<typeof CatMemoryId>;
export const CatInteractionId = createIdSchema(prefixes.interaction);
export type CatInteractionId = z.infer<typeof CatInteractionId>;
export const CatThoughtId = createIdSchema(prefixes.thought);
export type CatThoughtId = z.infer<typeof CatThoughtId>;
export const CatUserAffectionId = createIdSchema(prefixes.catUserAffection);
export type CatUserAffectionId = z.infer<typeof CatUserAffectionId>;
export const CatActivityId = createIdSchema(prefixes.catActivity);
export type CatActivityId = z.infer<typeof CatActivityId>;
export const ItemId = createIdSchema(prefixes.item);
export type ItemId = z.infer<typeof ItemId>;
export const UserItemId = createIdSchema(prefixes.userItem);
export type UserItemId = z.infer<typeof UserItemId>;
export const PurrlonTxnId = createIdSchema(prefixes.purrlonTxn);
export type PurrlonTxnId = z.infer<typeof PurrlonTxnId>;
export const WalletId = createIdSchema(prefixes.wallet);
export type WalletId = z.infer<typeof WalletId>;

interface GenerateIdOptions {
  /**
   * The length of the generated ID.
   * @default 12
   * @example 12 => "abc123def456"
   * */
  length?: number;
  /**
   * The separator to use between the prefix and the generated ID.
   * @default "_"
   * @example "_" => "str_abc123"
   * */
  separator?: string;
}

/**
 * Generates a unique ID with a given prefix.
 * @param prefix The prefix to use for the generated ID.
 * @param options The options for generating the ID.
 * @example
 * generateId("task") => "tsk_abc123def456"
 * generateId("user", { length: 8 }) => "usr_abc123d"
 * generateId("customer", { separator: "-" }) => "cst-abc123def456"
 */
export function generateId<T extends keyof typeof prefixes>(
  prefix: T,
  { length = 12, separator = "_" }: GenerateIdOptions = {},
): PrefixToId[T] {
  const id = customAlphabet(
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
    length,
  )();
  return `${prefixes[prefix]}${separator}${id}` as PrefixToId[T];
}
