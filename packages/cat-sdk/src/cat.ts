import { ChainId } from "caip";
import { arbitrum, base, baseSepolia, mainnet, optimism, polygon, sepolia } from "viem/chains";
import { z } from "zod";
// Enums
export const CAT_SPOTS = [
  "keyboard",
  "laptop",
  "box",
  "windowsill",
  "bed",
  "couch",
  "high_shelf",
  "paper_bag",
  "sunny_spot",
  "gaming_chair",
  "kitchen"
] as const;
export const CatSpot = z.enum(CAT_SPOTS);
export type CatSpot = z.infer<typeof CatSpot>;
export const CAT_ACTIVITIES = [
  "sleeping",
  "eating",
  "grooming",
  "playing",
  "loafing",
  "knocking_things",
  "box_sitting",
  "scratching",
  "hunting",
  "zooming",
  "keyboard_walking",
  "screen_blocking",
  "judging_humans",
  "making_content",
  "photoshoot",
] as const;
export const CatActivity = z.enum(CAT_ACTIVITIES);
export type CatActivity = z.infer<typeof CatActivity>;

// Add this new enum for output animations
export const CAT_EMOTIONS = [
  "annoyed",
  "curious",
  "happy",
  "sad",
  "angry",
  "scared",
  "excited",
  "sleepy",
  "smug",
  "sassy",
  "grumpy",
  "derpy",
  "judgy",
  "mischievous",
  "hungry",
  "energetic",
  "lazy",
  "comfy",
  "zoomies",
  "affectionate",
  "aloof",
  "attention_seeking",
  "suspicious",
  "playful",
  "content",
  "confused",
] as const;
export const CatEmotion = z.enum(CAT_EMOTIONS);
export type CatEmotion = z.infer<typeof CatEmotion>;

// Add this with other enums at the top
export const INTERACTION_STATUS = [
  "PENDING",
  "PROCESSING",
  "VALIDATION_FAILED",
  "COMPLETED",
  "FAILED",
] as const;
export const InteractionStatus = z.enum(INTERACTION_STATUS);
export type InteractionStatus = z.infer<typeof InteractionStatus>;

// Add this with other enums at the top
export const INPUT_VALIDATION_STATUS = [
  "VALID",
  "INVALID",
  "NOT_CHECKED"
] as const;
export const InputValidationStatus = z.enum(INPUT_VALIDATION_STATUS);
export type InputValidationStatus = z.infer<typeof InputValidationStatus>;

export const INTERNAL_INTERACTIONS_TYPES = ["AUTONOMOUS_THOUGHT"] as const;

export const INTERACTION_TYPE = [
  "PET",
  "FEED",
  "PLAY",
  "CHAT",
] as const;

export const InteractionType = z.enum(INTERACTION_TYPE);
export type InteractionType = z.infer<typeof InteractionType>;

export const ALL_INTERACTION_TYPES = [...INTERNAL_INTERACTIONS_TYPES, ...INTERACTION_TYPE] as const;
export const AllInteractionTypes = z.enum(ALL_INTERACTION_TYPES);
export type AllInteractionTypes = z.infer<typeof AllInteractionTypes>;

// Add near the top with other enums
export const INTERACTION_COSTS: Record<InteractionType, number> = {
  PET: 20,
  FEED: 20,
  PLAY: 20,
  CHAT: 2
};

// Add this near other enums
export const WALLET_TYPES = ["ETHEREUM"] as const;
export const WalletType = z.enum(WALLET_TYPES);
export type WalletType = z.infer<typeof WalletType>;

export const EvmAddress = z.custom<`0x${string}`>().refine((val) => {
  // Check if value exists and starts with 0x
  if (!val || !val.startsWith('0x')) return false;

  // Remove 0x prefix and check if remaining string is 40 chars of valid hex
  const hex = val.slice(2);
  return hex.length === 40 && /^[0-9a-fA-F]{40}$/.test(hex);
}, {
  message: "Invalid Ethereum address format - must be 0x-prefixed and 40 hex characters",
});
export type EvmAddress = z.infer<typeof EvmAddress>;

export const WalletChainId = z.union([z.literal(1), z.literal(137), z.literal(11155111), z.literal(42161), z.literal(10), z.literal(1), z.literal(8453), z.literal(84532)])
export type WalletChainId = z.infer<typeof WalletChainId>;

// https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-2.md
export const WalletCaipChainId = z.string();
export type WalletCaipChainId = z.infer<typeof WalletCaipChainId>;

// Add this helper function after the wallet-related types
export function parseCAIPChainId(caipChainId: string): WalletChainId {
  const caip = ChainId.parse(caipChainId);
  return WalletChainId.parse(caip.reference);
}

export type MnemonicType = `${string} ${string} ${string} ${string} ${string} ${string} ${string} ${string} ${string} ${string} ${string} ${string}`;
export const Mnemonic = z.custom<MnemonicType>().refine((val) => val.split(' ').length === 12, {
  message: "Mnemonic must be 12 words",
});
export type Mnemonic = z.infer<typeof Mnemonic>;


export const ChainIdToNetwork = {
  8453: base,
  84532: baseSepolia,
  1: mainnet,
  137: polygon,
  11155111: sepolia,
  42161: arbitrum,
  10: optimism,
}

export const THOUGHT_TYPES = [
  "REFLECTION",
  "DESIRE",
  "OBSERVATION",
] as const;
export const ThoughtType = z.enum(THOUGHT_TYPES);
export type ThoughtType = z.infer<typeof ThoughtType>;