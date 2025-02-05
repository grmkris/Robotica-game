import {
  Percent,
  Token as UniswapToken
} from '@uniswap/sdk-core';
import { SwapRouter } from '@uniswap/universal-router-sdk';
import type { Logger } from 'cat-logger';
import type { EvmAddress, WalletChainId } from "cat-sdk";
import type { WalletClient } from "viem";
import { createPublicClient, getAddress, http } from "viem";
import type { Chain } from "viem/chains";
import { getBestTrade, getChainAddresses, getV2Quote, getV3Quote } from './uniswapRouter';
import { buildTrade, ensureTokenApproval, getTokenDetails, handleWethOperation } from './uniswapUtils';

// Types for Uniswap operations
export type UniswapTradeInput = {
  tokenIn: EvmAddress;
  tokenOut: EvmAddress;
  amount: bigint;
  slippage?: number; // in percentage, default 0.5%
  deadline?: number; // in seconds
  recipient?: EvmAddress;
  chainId?: WalletChainId;
};

export type UniswapQuoteOutput = {
  tokenIn: {
    address: EvmAddress;
    amount: bigint;
    symbol?: string;
    decimals?: number;
  };
  tokenOut: {
    address: EvmAddress;
    amount: bigint;
    amountMin: bigint;
    symbol?: string;
    decimals?: number;
  };
  priceImpact: number;
};

// Uniswap client interface
export type CatWalletUniswapClient = {
  // Swap-related functions
  getQuote: (props: UniswapTradeInput) => Promise<UniswapQuoteOutput>;
  executeTrade: (props: UniswapTradeInput) => Promise<string>; // Returns transaction hash
};

// Update createUniswapClient to remove the duplicate getChainAddresses function
export const createUniswapClient = (props: {
  walletClient: WalletClient;
  chain?: Chain;
  rpcUrl?: string;
  logger: Logger;
}): CatWalletUniswapClient => {
  const chain = props.chain || props.walletClient.chain;
  const publicClient = createPublicClient({
    chain,
    transport: props.rpcUrl ? http(props.rpcUrl) : http()
  });
  const { walletClient, logger } = props;
  if (props.chain?.id && props.chain.id !== walletClient.chain?.id) {
    throw new Error('Chain mismatch');
  }

  const getQuote = async (props: UniswapTradeInput): Promise<UniswapQuoteOutput> => {
    const { tokenIn, tokenOut, amount, chainId = chain?.id as WalletChainId } = props;
    if (!chainId) throw new Error('No chainId available');
    // Fetch token details
    const [token0Details, token1Details] = await Promise.all([
      getTokenDetails(tokenIn, publicClient),
      getTokenDetails(tokenOut, publicClient)
    ]);

    // Create SDK Token instances with chainId
    const token0 = new UniswapToken(
      chainId,
      tokenIn,
      token0Details.decimals,
      token0Details.symbol,
      token0Details.name
    );

    const token1 = new UniswapToken(
      chainId,
      tokenOut,
      token1Details.decimals,
      token1Details.symbol,
      token1Details.name
    );

    const [v3Trade, v2Trade] = await Promise.all([
      getV3Quote({
        token0,
        token1,
        amount,
        publicClient,
        logger
      }),
      getV2Quote({
        token0,
        token1,
        amount,
        publicClient,
        logger
      })
    ]);

    // Select best trade
    const bestTrade = getBestTrade(v2Trade, v3Trade);
    if (!bestTrade) throw new Error(`No valid trade route found between ${tokenIn} and ${tokenOut}`);

    // Format response
    return {
      tokenIn: {
        address: tokenIn,
        amount: amount,
        symbol: token0Details.symbol,
        decimals: token0Details.decimals
      },
      tokenOut: {
        address: tokenOut,
        amount: BigInt(bestTrade.outputAmount.quotient.toString()),
        amountMin: BigInt(bestTrade.minimumAmountOut(new Percent(props.slippage ?? 50, 10000)).quotient.toString()),
        symbol: token1Details.symbol,
        decimals: token1Details.decimals
      },
      priceImpact: Number(bestTrade.priceImpact.toSignificant(3)),
    };
  };

  const executeTrade = async (props: UniswapTradeInput): Promise<string> => {
    const tokenIn = getAddress(props.tokenIn);
    const tokenOut = getAddress(props.tokenOut);
    const chainId = props.chainId || chain?.id as WalletChainId;
    if (!chainId) throw new Error('No chainId available');
    const addresses = getChainAddresses(chainId);
    const { amount, recipient } = props;

    if (!walletClient.account || !walletClient.chain) {
      throw new Error('No account or chain available');
    }

    const ETH_ADDRESS = addresses.ETH;
    const WETH_ADDRESS = addresses.WETH;

    // Handle ETH wrapping/unwrapping cases
    if ((tokenIn === ETH_ADDRESS && tokenOut === WETH_ADDRESS) ||
      (tokenIn === WETH_ADDRESS && tokenOut === ETH_ADDRESS)) {
      return handleWethOperation({
        tokenIn,
        amount,
        walletClient,
        chainId,
        WETH_ADDRESS,
        logger
      });
    }

    // For ERC20 tokens, ensure proper approval
    if (tokenIn !== ETH_ADDRESS) {
      await ensureTokenApproval({
        tokenAddress: tokenIn,
        amount,
        walletClient,
        publicClient,
        spender: addresses.UNIVERSAL_ROUTER,
        chainId,
        logger
      });
    }

    // Get trade details
    const [token0Details, token1Details] = await Promise.all([
      getTokenDetails(tokenIn, publicClient),
      getTokenDetails(tokenOut, publicClient)
    ]);

    const token0 = new UniswapToken(
      walletClient.chain.id,
      tokenIn,
      token0Details.decimals,
      token0Details.symbol,
      token0Details.name
    );

    const token1 = new UniswapToken(
      walletClient.chain.id,
      tokenOut,
      token1Details.decimals,
      token1Details.symbol,
      token1Details.name
    );

    // Get best trade route
    const [v3Trade, v2Trade] = await Promise.all([
      getV3Quote({
        token0,
        token1,
        amount,
        publicClient,
        logger
      }).catch((err) => {
        logger.debug(`V3 quote failed: ${err.message}`);
        return null;
      }),
      getV2Quote({
        token0,
        token1,
        amount,
        publicClient,
        logger
      }).catch((err) => {
        logger.debug(`V2 quote failed: ${err.message}`);
        return null;
      })
    ]);
    const bestTrade = getBestTrade(v2Trade, v3Trade);

    // Get current block for deadline
    const block = await publicClient.getBlock();
    const blockTimestamp = block.timestamp;
    const deadline = blockTimestamp + 1800n; // 30 minutes from now
    if (!bestTrade) throw new Error('No valid trade route found');

    const routerTrade = buildTrade([bestTrade]);

    // Prepare Universal Router parameters
    const options = {
      slippageTolerance: new Percent(props.slippage ?? 50, 10000),
      deadline: Number(deadline), // Convert BigInt to number as required by SDK
      recipient: recipient || walletClient.account.address,
    };

    try {
      const { calldata, value } = SwapRouter.swapCallParameters(routerTrade, options);

      if (!calldata || calldata === '0x') {
        throw new Error('Invalid swap calldata generated');
      }

      // Validate transaction parameters before sending
      if (!addresses.UNIVERSAL_ROUTER) {
        throw new Error('Universal Router address not found for chain');
      }

      const hash = await walletClient.sendTransaction({
        to: addresses.UNIVERSAL_ROUTER as `0x${string}`,
        data: calldata as `0x${string}`,
        value: BigInt(value),
        account: walletClient.account,
        chain: walletClient.chain,
      });

      // Wait for transaction receipt to get more error details if needed
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      logger.debug({
        msg: 'Swap transaction receipt',
        receipt: {
          hash,
          status: receipt.status
        }
      });

      if (receipt.status === 'reverted') {
        throw new Error('Transaction reverted');
      }

      return hash;
    } catch (error) {
      logger.error('Swap execution failed:', {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack
        } : 'Unknown error',
        tokenIn,
        tokenOut,
        amount: amount.toString(),
        chainId: walletClient.chain?.id
      });
      throw error;
    }
  };

  return {
    getQuote,
    executeTrade,
  };
};