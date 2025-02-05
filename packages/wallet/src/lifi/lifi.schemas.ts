import type { LiFiStep } from '@lifi/sdk';
import { EvmAddress, WalletChainId } from 'cat-sdk';
import { z } from 'zod';


// Common token schema
const tokenSchema = z.object({
  address: EvmAddress,
  symbol: z.string(),
  decimals: z.number(),
});

// Fee cost schema
const feeCostSchema = z.object({
  name: z.string(),
  amount: z.string(),
  token: tokenSchema,
});

// Quote input schema
export const SwapQuoteInput = z.object({
  fromChainId: WalletChainId,
  toChainId: WalletChainId,
  fromTokenAddress: EvmAddress,
  toTokenAddress: EvmAddress,
  fromAmount: z.string(),
  slippage: z.number().optional(),
});


// Quote output schema
export const SwapQuoteOutput = z.custom<LiFiStep>();

// Execute input schema
export const SwapExecuteInput = z.object({
  fromChainId: WalletChainId,
  toChainId: WalletChainId,
  fromTokenAddress: EvmAddress,
  toTokenAddress: EvmAddress,
  fromAmount: z.string(),
  slippage: z.number().optional(),
  updateCallback: z.function()
    .args(z.object({
      status: z.enum(['PENDING', 'DONE', 'FAILED']),
      currentStep: z.number(),
      totalSteps: z.number(),
      txHash: z.string().optional(),
      error: z.string().optional(),
    }))
    .optional(),
});

// Execute output schema
export const SwapExecuteOutput = z.object({
  status: z.enum(['DONE', 'FAILED']),
  txHash: z.string().optional(),
  toAmount: z.string().optional(),
  error: z.string().optional(),
});

// Route step schema
const routeStepSchema = z.object({
  type: z.enum(['lifi']),
  protocol: z.string(),
  estimate: z.object({
    fromAmount: z.string(),
    toAmount: z.string(),
    toAmountMin: z.string(),
    feeCosts: z.array(feeCostSchema),
  }),
});

// Get routes input schema
export const SwapGetRoutesInput = SwapQuoteInput;

// Get routes output schema
export const SwapGetRoutesOutput = z.array(z.object({
  estimate: z.object({
    fromAmount: z.string(),
    toAmount: z.string(),
    toAmountMin: z.string(),
    executionDuration: z.number(),
    feeCosts: z.array(feeCostSchema),
  }),
  steps: z.array(routeStepSchema),
}));

export type SwapQuoteInput = z.infer<typeof SwapQuoteInput>;
export type SwapQuoteOutput = z.infer<typeof SwapQuoteOutput>;
export type SwapExecuteInput = z.infer<typeof SwapExecuteInput>;
export type SwapExecuteOutput = z.infer<typeof SwapExecuteOutput>;
export type SwapGetRoutesInput = z.infer<typeof SwapGetRoutesInput>;
export type SwapGetRoutesOutput = z.infer<typeof SwapGetRoutesOutput>;

// Add these new schemas

export const TokensByChainOutput = z.record(
  WalletChainId,
  z.array(
    z.object({
      address: EvmAddress,
      symbol: z.string(),
      decimals: z.number(),
      name: z.string(),
      priceUSD: z.string().optional(),
      chainId: WalletChainId,
      logoURI: z.string().optional(),
    })
  )
);

export const ConnectionsInput = z.object({
  fromChain: WalletChainId.optional(),
  fromToken: EvmAddress.optional(),
  toChain: WalletChainId.optional(),
  toToken: EvmAddress.optional(),
});

export const ConnectionsOutput = z.object({
  connections: z.array(
    z.object({
      fromChainId: WalletChainId,
      fromTokenAddress: EvmAddress,
      toChainId: WalletChainId,
      toTokenAddress: EvmAddress,
      bridges: z.array(z.string()),
      exchanges: z.array(z.string()),
    })
  ),
  recommendations: z.object({
    bridges: z.array(z.string()),
    exchanges: z.array(z.string()),
  }),
});

export type TokensByChainOutput = z.infer<typeof TokensByChainOutput>;
export type ConnectionsInput = z.infer<typeof ConnectionsInput>;
export type ConnectionsOutput = z.infer<typeof ConnectionsOutput>;