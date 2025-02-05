import {
  type Currency,
  CurrencyAmount,
  TradeType,
  type Token as UniswapToken
} from '@uniswap/sdk-core';
import { Route as V2Route, Trade as V2Trade } from '@uniswap/v2-sdk';
import { Route as V3Route, Trade as V3Trade } from '@uniswap/v3-sdk';
import type { Logger } from 'cat-logger';
import type { EvmAddress, WalletChainId } from 'cat-sdk';
import type { PublicClient } from 'viem';
import { QuoterABI } from './abis/QuoterABI';
import { getPair, getPool } from './uniswapUtils';

// Add FEE_TIERS constant
export const FEE_TIERS = [500, 3000, 10000] as const;

// Expand UNISWAP_ADDRESSES with V2 addresses
const UNISWAP_ADDRESSES = {
  1: {
    V3_FACTORY: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    V2_FACTORY: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
    V2_ROUTER: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    SWAP_ROUTER_02: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    QUOTER_V2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    POSITION_MANAGER: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
    PERMIT2: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
    UNIVERSAL_ROUTER: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD',
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
  },
  11155111: {
    V3_FACTORY: '0x0227628f3F023bb0B980b67D528571c95c6DaC1c',
    V2_FACTORY: '0xF62c03E08ada871A0bEb309762E260a7a6a880E6',
    V2_ROUTER: '0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3',
    SWAP_ROUTER_02: '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E',
    QUOTER_V2: '0xEd1f6473345F45b75F8179591dd5bA1888cf2FB3',
    POSITION_MANAGER: '0x1238536071E1c677A632429e3655c799b22cDA52',
    PERMIT2: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
    UNIVERSAL_ROUTER: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD',
    WETH: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
    ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
  },
  8453: {
    V3_FACTORY: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
    V2_FACTORY: '0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6',
    V2_ROUTER: '0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24',
    SWAP_ROUTER_02: '0x2626664c2603336E57B271c5C0b26F421741e481',
    UNIVERSAL_ROUTER: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD',
    QUOTER_V2: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    POSITION_MANAGER: '0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1',
    PERMIT2: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
    WETH: '0x4200000000000000000000000000000000000006',
    ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
  },
  84532: {
    V3_FACTORY: '0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24',
    V2_FACTORY: '0xTODO',
    SWAP_ROUTER_02: '0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4',
    UNIVERSAL_ROUTER: '0x050E797f3625EC8785265e1d9BDd4799b97528A1',
    QUOTER_V2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    PERMIT2: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
    WETH: '0x4200000000000000000000000000000000000006',
    ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
  },
} as const;

// Update getChainAddresses to return UNISWAP_ADDRESSES mapping
export const getChainAddresses = (chainId: WalletChainId) => {
  switch (chainId) {
    case 8453: // Base
      return UNISWAP_ADDRESSES[8453];
    case 84532: // Base Sepolia
      return UNISWAP_ADDRESSES[84532];
    case 11155111: // Ethereum Sepolia
      return UNISWAP_ADDRESSES[11155111];
    default:
      throw new Error(`Unsupported chainId: ${chainId}`);
  }
};

async function getV2Quote(
  props: {
    token0: UniswapToken,
    token1: UniswapToken,
    amount: bigint,
    publicClient: PublicClient,
    logger: Logger
  }
): Promise<V2Trade<Currency, Currency, TradeType> | null> {
  const { token0, token1, amount, publicClient, logger } = props;
  logger?.debug({
    msg: 'Getting V2 quote',
    token0: token0.address,
    token1: token1.address,
    amount
  });
  try {
    const pair = await getPair({ tokenA: token0, tokenB: token1, publicClient, logger });
    if (!pair) return null;

    const inputAmount = CurrencyAmount.fromRawAmount(token0, amount.toString());
    const route = new V2Route([pair], token0, token1);
    return new V2Trade(
      route,
      inputAmount,
      TradeType.EXACT_INPUT
    );
  } catch (error) {
    logger.warn({
      msg: 'V2 quote failed',
      error
    });
    return null;
  }
}

async function getV3Quote(
  props: {
    token0: UniswapToken,
    token1: UniswapToken,
    amount: bigint,
    publicClient: PublicClient,
    logger: Logger
  }
): Promise<V3Trade<Currency, Currency, TradeType> | null> {
  const { token0, token1, amount, publicClient, logger } = props;

  try {
    // Find the best pool across different fee tiers
    let bestQuote: bigint | null = null;
    let bestPool = null;

    for (const fee of FEE_TIERS) {
      try {

        // check if pool exists
        const pool = await getPool({ tokenA: token0, tokenB: token1, feeAmount: fee, publicClient, logger });
        if (!pool) continue;

        const result = await publicClient.simulateContract({
          address: getChainAddresses(publicClient.chain?.id as WalletChainId ?? 8453).QUOTER_V2,
          abi: QuoterABI,
          functionName: 'quoteExactInputSingle',
          args: [{
            tokenIn: pool.token0.address as EvmAddress,
            tokenOut: pool.token1.address as EvmAddress,
            amountIn: amount,
            fee: pool.fee,
            sqrtPriceLimitX96: 0n
          }]
        });

        const quotedAmountOut = result.result;

        if (!bestQuote || quotedAmountOut[0] > bestQuote) {
          bestQuote = quotedAmountOut[0];
          bestPool = await getPool({
            tokenA: token0,
            tokenB: token1,
            feeAmount: fee,
            publicClient,
            logger
          });
        }

      } catch (error) {
        logger.warn({
          msg: `Failed to get quote for fee tier ${fee}`,
          error
        });
      }
    }

    if (!bestQuote || !bestPool) {
      logger.warn('No valid V3 quote found');
      return null;
    }

    // Create trade object
    const inputAmount = CurrencyAmount.fromRawAmount(token0, amount.toString());
    const route = new V3Route([bestPool], token0, token1);
    const trade = await V3Trade.fromRoute(
      route,
      inputAmount,
      TradeType.EXACT_INPUT
    );

    return trade;

  } catch (error) {
    logger.warn({
      msg: 'V3 quote failed',
      error
    });
    return null;
  }
}

function getBestTrade(
  v2Trade: V2Trade<Currency, Currency, TradeType> | null,
  v3Trade: V3Trade<Currency, Currency, TradeType> | null
): V2Trade<Currency, Currency, TradeType> | V3Trade<Currency, Currency, TradeType> | null {
  if (!v2Trade && !v3Trade) return null;
  if (!v2Trade) return v3Trade;
  if (!v3Trade) return v2Trade;

  const v2OutputAmount = BigInt(v2Trade.outputAmount.quotient.toString());
  const v3OutputAmount = BigInt(v3Trade.outputAmount.quotient.toString());

  if (v3OutputAmount > v2OutputAmount && v3Trade.priceImpact <= v2Trade.priceImpact) {
    return v3Trade;
  }

  if (v3OutputAmount > (v2OutputAmount * BigInt(105)) / BigInt(100)) {
    return v3Trade;
  }

  return v2Trade;
}

export { getBestTrade, getV2Quote, getV3Quote };
