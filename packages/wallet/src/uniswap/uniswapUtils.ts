import { Signature } from '@noble/secp256k1'
import { AllowanceTransfer, type PermitSingle } from '@uniswap/permit2-sdk'
import { type MixedRouteSDK, MixedRouteTrade, Trade as RouterTrade, type SwapOptions } from '@uniswap/router-sdk'
import { type Currency, CurrencyAmount, Ether, Percent, type Token, type TradeType } from '@uniswap/sdk-core'
import { UNIVERSAL_ROUTER_ADDRESS, UniversalRouterVersion } from '@uniswap/universal-router-sdk'
import type { Permit2Permit } from '@uniswap/universal-router-sdk/dist/utils/inputTokens'
import { Pair, type Route as RouteV2, Trade as V2Trade, computePairAddress as computeV2PairAddress } from '@uniswap/v2-sdk'
import {
  FeeAmount,
  Pool,
  type Route as RouteV3,
  TICK_SPACINGS,
  TickMath,
  Trade as V3Trade,
  computePoolAddress,
  nearestUsableTick
} from '@uniswap/v3-sdk'
import { type Route as RouteV4, Trade as V4Trade } from '@uniswap/v4-sdk'
import type { Logger } from 'cat-logger'
import type { EvmAddress, WalletChainId } from 'cat-sdk'
import { type Account, type PublicClient, type TypedDataDomain, type WalletClient, erc20Abi, hexToNumber } from 'viem'
import { PERMIT2_ABI } from './abis/Permit2ABI'
import { UNISWAP_V2_ABI } from './abis/UniswapV2PoolABI'
import { UniswapV3PoolABI } from './abis/UniswapV3PoolABI'
import { WETH_ABI } from './abis/wethABI'
import { getChainAddresses } from './uniswapRouter'

const TEST_RECIPIENT_ADDRESS = [
  '0x0000000000000000000000000000000000000000',
];

export const ETHER = Ether.onChain(1)
export const FEE_AMOUNT = FeeAmount.MEDIUM

export async function getPair(props: {
  tokenA: Token,
  tokenB: Token,
  publicClient: PublicClient,
  logger?: Logger
}): Promise<Pair> {
  const { tokenA, tokenB, publicClient, logger } = props;

  logger?.debug({
    msg: 'Getting pair',
    tokenA: tokenA.address,
    tokenB: tokenB.address,
  })
  const pairAddress = computeV2PairAddress({ factoryAddress: getChainAddresses(publicClient.chain?.id as WalletChainId ?? 8453).V2_FACTORY, tokenA, tokenB }) as `0x${string}`

  logger?.debug({
    msg: 'Pair address',
    pairAddress,
  })

  const [reserve0, reserve1] = await publicClient.readContract({
    address: pairAddress,
    abi: UNISWAP_V2_ABI,
    functionName: 'getReserves',
    args: [],
    blockTag: 'finalized'
  })
  const [token0, token1] = tokenA.sortsBefore(tokenB) ? [tokenA, tokenB] : [tokenB, tokenA] // does safety checks
  return new Pair(CurrencyAmount.fromRawAmount(token0, reserve0.toString()), CurrencyAmount.fromRawAmount(token1, reserve1.toString()))
}

export async function getPool(props: {
  tokenA: Token,
  tokenB: Token,
  feeAmount: FeeAmount,
  publicClient: PublicClient,
  logger: Logger
}): Promise<Pool> {
  const { tokenA, tokenB, feeAmount, publicClient, logger } = props;
  const chainId = props.publicClient?.chain?.id;
  if (!chainId) throw new Error('Chain ID is not available');
  logger?.debug({
    msg: 'Getting pool',
    tokenA: tokenA.address,
    tokenB: tokenB.address,
  })
  const [token0, token1] = tokenA.sortsBefore(tokenB) ? [tokenA, tokenB] : [tokenB, tokenA] // does safety checks
  const poolAddress = computePoolAddress({ factoryAddress: "0x0227628f3F023bb0B980b67D528571c95c6DaC1c", tokenA, tokenB, fee: feeAmount, chainId }) as `0x${string}`

  // Fetch all required pool data in parallel
  const [slot0, liquidityData] = await Promise.all([
    publicClient.readContract({
      address: poolAddress,
      abi: UniswapV3PoolABI,
      functionName: 'slot0',
      args: [],
    }),
    publicClient.readContract({
      address: poolAddress,
      abi: UniswapV3PoolABI,
      functionName: 'liquidity',
      args: [],
    }),
  ])

  const sqrtPriceX96 = BigInt(slot0[0].toString())
  const tick = slot0[1]
  const liquidity = BigInt(liquidityData.toString())

  return new Pool(token0, token1, feeAmount, sqrtPriceX96.toString(), liquidity.toString(), tick, [
    {
      index: nearestUsableTick(TickMath.MIN_TICK, TICK_SPACINGS[feeAmount]),
      liquidityNet: liquidity.toString(),
      liquidityGross: liquidity.toString(),
    },
    {
      index: nearestUsableTick(TickMath.MAX_TICK, TICK_SPACINGS[feeAmount]),
      liquidityNet: (BigInt(-1) * liquidity).toString(),
      liquidityGross: liquidity.toString(),
    },
  ])
}

// use some sane defaults
export function swapOptions(options: Partial<SwapOptions>): SwapOptions {
  // If theres a fee this counts as "slippage" for the amount out, so take it into account
  let slippageTolerance = new Percent(5, 100)
  if (options.fee) slippageTolerance = slippageTolerance.add(options.fee.fee)
  return Object.assign(
    {
      slippageTolerance,
      recipient: TEST_RECIPIENT_ADDRESS,
    },
    options
  )
}

// alternative constructor to create from protocol-specific sdks
export function buildTrade(
  trades: (
    | V2Trade<Currency, Currency, TradeType>
    | V3Trade<Currency, Currency, TradeType>
    | V4Trade<Currency, Currency, TradeType>
    | MixedRouteTrade<Currency, Currency, TradeType>
  )[]
): RouterTrade<Currency, Currency, TradeType> {
  return new RouterTrade({
    v2Routes: trades
      .filter((trade) => trade instanceof V2Trade)
      .map((trade) => ({
        routev2: trade.route as RouteV2<Currency, Currency>,
        inputAmount: trade.inputAmount,
        outputAmount: trade.outputAmount,
      })),
    v3Routes: trades
      .filter((trade) => trade instanceof V3Trade)
      .map((trade) => ({
        routev3: trade.route as RouteV3<Currency, Currency>,
        inputAmount: trade.inputAmount,
        outputAmount: trade.outputAmount,
      })),
    v4Routes: trades
      .filter((trade) => trade instanceof V4Trade)
      .map((trade) => ({
        routev4: trade.route as RouteV4<Currency, Currency>,
        inputAmount: trade.inputAmount,
        outputAmount: trade.outputAmount,
      })),
    mixedRoutes: trades
      .filter((trade) => trade instanceof MixedRouteTrade)
      .map((trade) => ({
        mixedRoute: trade.route as MixedRouteSDK<Currency, Currency>,
        inputAmount: trade.inputAmount,
        outputAmount: trade.outputAmount,
      })),
    tradeType: trades[0].tradeType,
  })
}
const TEST_DEADLINE = '3000000000000'

/// returns signature bytes
export async function generatePermitSignature(
  permit: PermitSingle,
  signer: WalletClient,
  account: Account,
  chainId: WalletChainId,
  permitAddress: string = getChainAddresses(chainId).PERMIT2
): Promise<string> {
  const { domain, types, values } = AllowanceTransfer.getPermitData(permit, permitAddress, chainId)
  return await signer.signTypedData({
    domain: domain as TypedDataDomain,
    types: types,
    message: values as unknown as Record<string, unknown>,
    account,
    primaryType: 'PermitSingle',
  })
}
export async function generateEip2098PermitSignature(
  permit: PermitSingle,
  signer: WalletClient,
  account: Account,
  chainId: WalletChainId,
  permitAddress: string = getChainAddresses(chainId).PERMIT2
): Promise<string> {
  const sig = await generatePermitSignature(permit, signer, account, chainId, permitAddress)
  const v = hexToNumber(`0x${sig.slice(130)}`)
  const recoveryBit = v - 27

  const signature = Signature.fromCompact(sig.slice(2, 130))
    .addRecoveryBit(recoveryBit)

  return `0x${signature.toCompactHex()}${v.toString(16).padStart(2, '0')}`
}


export function toInputPermit(signature: string, permit: PermitSingle): Permit2Permit {
  return {
    ...permit,
    signature,
  }
}
export const MAX_UINT160 = BigInt("0xffffffffffffffffffffffffffffffffffffffff")

export function makePermit(
  token: string,
  amount: string = MAX_UINT160.toString(),
  nonce = '0',
  routerAddress: string = UNIVERSAL_ROUTER_ADDRESS(UniversalRouterVersion.V2_0, 1)
): PermitSingle {
  return {
    details: {
      token,
      amount,
      expiration: TEST_DEADLINE,
      nonce,
    },
    spender: routerAddress,
    sigDeadline: TEST_DEADLINE,
  }
}

// Add helper functions
export async function getTokenDetails(
  tokenAddress: EvmAddress,
  publicClient: PublicClient
): Promise<{
  decimals: number;
  symbol: string;
  name: string;
}> {
  // Special case for ETH
  if (tokenAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
    return {
      decimals: 18,
      symbol: 'ETH',
      name: 'Ethereum'
    };
  }

  const [decimals, symbol, name] = await Promise.all([
    publicClient.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'decimals'
    }) as Promise<number>,
    publicClient.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'symbol'
    }) as Promise<string>,
    publicClient.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'name'
    }) as Promise<string>
  ]);
  return { decimals, symbol, name };
}

// Helper function to handle WETH operations
export async function handleWethOperation(
  props: {
    tokenIn: string,
    amount: bigint,
    walletClient: WalletClient,
    chainId: WalletChainId,
    WETH_ADDRESS: string,
    logger: Logger
  }
): Promise<string> {
  const { tokenIn, amount, walletClient, chainId, WETH_ADDRESS } = props;
  if (!walletClient.account) {
    throw new Error('No account available');
  }
  if (!walletClient.chain) {
    throw new Error('No chain available');
  }
  const addresses = getChainAddresses(chainId);
  const isWrap = tokenIn === addresses.ETH;
  const hash = await walletClient.writeContract({
    address: WETH_ADDRESS as `0x${string}`,
    abi: WETH_ABI,
    functionName: isWrap ? 'deposit' : 'withdraw',
    args: isWrap ? [] : [amount],
    value: isWrap ? amount : 0n,
    account: walletClient.account,
    chain: walletClient.chain,
  });
  return hash;
}

// Helper function to handle token approvals
export async function ensureTokenApproval(
  props: {
    tokenAddress: `0x${string}`,
    amount: bigint,
    walletClient: WalletClient,
    publicClient: PublicClient,
    spender: `0x${string}`,
    chainId: WalletChainId,
    logger: Logger
  }
): Promise<void> {
  const { tokenAddress, amount, walletClient, publicClient, spender, chainId, logger } = props;
  if (!walletClient.account) throw new Error('No account available');
  if (!walletClient.chain) throw new Error('No chain available');
  if (!spender) throw new Error('No spender available');

  // First approve Permit2 if needed
  const addresses = getChainAddresses(chainId);
  const permit2Address = addresses.PERMIT2;
  const tokenAllowance = await publicClient.readContract({
    address: tokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [walletClient.account.address, permit2Address]
  });

  if (tokenAllowance < amount) {
    logger.debug('Approving Permit2 contract...');
    const approvalTx = await walletClient.writeContract({
      address: tokenAddress as `0x${string}`,
      abi: erc20Abi,
      functionName: 'approve',
      args: [permit2Address, MAX_UINT160],
      account: walletClient.account,
      chain: walletClient.chain,
    });
    await publicClient.waitForTransactionReceipt({ hash: approvalTx });
  }

  // Then check and update Permit2 allowance
  const permit2Allowance = await publicClient.readContract({
    address: permit2Address as `0x${string}`,
    abi: PERMIT2_ABI,
    functionName: 'allowance',
    args: [
      walletClient.account.address,
      tokenAddress,
      spender
    ]
  });

  if (!permit2Allowance || permit2Allowance[0] < amount || permit2Allowance[1] < Math.floor(Date.now() / 1000)) {
    logger.debug('Updating Permit2 allowance...');
    // const deadline = BigInt(Math.floor(Date.now() / 1000) + 2592000); // 30 days from now

    const block = await publicClient.getBlock();
    const blockTimestamp = block.timestamp;
    const deadline = blockTimestamp + 2592000n;

    await walletClient.writeContract({
      address: permit2Address as `0x${string}`,
      abi: PERMIT2_ABI,
      functionName: 'approve',
      args: [
        tokenAddress,
        spender,
        MAX_UINT160,
        Number(deadline)
      ],
      account: walletClient.account,
      chain: walletClient.chain,
    });
  }
}
