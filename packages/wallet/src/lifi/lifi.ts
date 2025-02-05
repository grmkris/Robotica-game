import {
  type ConnectionsRequest,
  EVM,
  type ExecutionOptions,
  type LiFiStep,
  type QuoteRequest,
  type RouteExtended,
  type TokensRequest,
  convertQuoteToRoute,
  createConfig,
  executeRoute,
  getQuote,
  getConnections as lifiGetConnections,
  getTokens as lifiGetTokens
} from "@lifi/sdk";
import type { Logger } from "cat-logger";
import type { WalletChainId } from "cat-sdk";
import type { WalletClient } from "viem";
import {
  SwapExecuteOutput,
  SwapQuoteInput,
} from './lifi.schemas';

// Create LIFI config with integrator name and EVM provider
export const createLifiConfig = (walletClient: WalletClient) => {
  return createConfig({
    integrator: 'CatMisha',
    // Add EVM provider configuration
    providers: [
      EVM({
        getWalletClient: () => Promise.resolve(walletClient),
      }),
    ],
    // Adding recommended default options
    routeOptions: {
      slippage: 0.005,
      order: 'CHEAPEST',
      allowDestinationCall: true,
    }
  });
};

export type SwapParams = {
  from: {
    chainId: number;
    tokenAddress: string;
    amount: string;
    walletAddress: string;
  };
  to: {
    chainId: number;
    tokenAddress: string;
  };
  options?: {
    slippage?: number;
    allowDestinationCall?: boolean;
    order?: 'CHEAPEST' | 'FASTEST';
  };
};

export type ExecutionSettings = {
  updateCallback?: (route: RouteExtended) => void;
  onAcceptExchangeRate?: (oldAmount: string, newAmount: string) => Promise<boolean>;
  infiniteApproval?: boolean;
  executeInBackground?: boolean;
};

export type SwapStatus = {
  status: 'PENDING' | 'DONE' | 'FAILED';
  currentStep: number;
  totalSteps: number;
  txHash?: string;
  error?: string;
};

export const createLifiClient = (props: { walletClient: WalletClient, logger: Logger, apiKey: string, integrator: string }) => {
  const { walletClient } = props;
  // Initialize config with wallet client
  createLifiConfig(walletClient);

  return {
    getQuote: async (params: SwapQuoteInput): Promise<LiFiStep> => {
      const validatedInput = SwapQuoteInput.parse(params);
      if (!walletClient.account?.address) {
        throw new Error('Wallet address is not set');
      }
      const quoteRequest: QuoteRequest = {
        fromChain: validatedInput.fromChainId,
        toChain: validatedInput.toChainId,
        fromToken: validatedInput.fromTokenAddress,
        toToken: validatedInput.toTokenAddress,
        fromAmount: validatedInput.fromAmount,
        fromAddress: walletClient.account.address,
        toAddress: walletClient.account.address,
        slippage: validatedInput.slippage ?? 0.005,
      };

      const quote = await getQuote(quoteRequest);

      if (!quote.estimate || !quote.transactionRequest) {
        throw new Error('Invalid quote response');
      }

      return quote;
    },

    executeQuote: async (quote: LiFiStep & ExecutionSettings) => {
      const { updateCallback, infiniteApproval, ...quoteData } = quote;

      const route = convertQuoteToRoute(quoteData);

      const executionOptions: ExecutionOptions = {
        updateRouteHook: updateCallback,
        infiniteApproval: infiniteApproval ?? false,
      };

      try {
        const result = await executeRoute(route, executionOptions);

        return SwapExecuteOutput.parse({
          status: result.steps.every(step => step.execution?.status === 'DONE') ? 'DONE' : 'FAILED',
          txHash: result.steps[0]?.execution?.process[0]?.txHash,
          toAmount: result.toAmount,
          error: result.steps.find(step => step.execution?.status === 'FAILED')?.execution?.process[0]?.error?.message,
        });
      } catch (error) {
        return SwapExecuteOutput.parse({
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        });
      }
    },

    getTokens: async (params?: {
      chains?: WalletChainId[],
      // Add ChainType when needed: chains?: ChainType[]
    }) => {
      const tokenRequest: TokensRequest = {
        chains: params?.chains?.map(Number)
      };

      const result = await lifiGetTokens(tokenRequest);

      // Transform and return tokens by chain
      return Object.entries(result.tokens).reduce((acc, [chainId, tokens]) => {
        acc[Number(chainId)] = tokens.map(token => ({
          address: token.address,
          symbol: token.symbol,
          decimals: token.decimals,
          name: token.name,
          priceUSD: token.priceUSD,
          chainId: token.chainId,
          logoURI: token.logoURI,
        }));
        return acc;
      }, {} as Record<number, Array<{
        address: string;
        symbol: string;
        decimals: number;
        name: string;
        priceUSD?: string;
        chainId: number;
        logoURI?: string;
      }>>);
    },

    getConnections: async (params: {
      fromChain?: number;
      fromToken?: string;
      toChain?: number;
      toToken?: string;
    }) => {
      const connectionRequest: ConnectionsRequest = {
        fromChain: params.fromChain,
        fromToken: params.fromToken,
        toChain: params.toChain,
        toToken: params.toToken,
        allowSwitchChain: true,
        allowDestinationCall: true,
      };

      const result = await lifiGetConnections(connectionRequest);


      return {
        connections: result.connections.map(connection => ({
          fromChainId: connection.fromChainId,
          fromTokenAddress: connection.fromTokens[0].address,
          toChainId: connection.toChainId,
          toTokenAddress: connection.toTokens[0].address,
        })),
      };
    },
  };
};

export type LifiClient = ReturnType<typeof createLifiClient>