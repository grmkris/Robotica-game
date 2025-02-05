import {
  type BlockchainProviderConnector,
  HashLock,
  OrderStatus,
  PresetEnum,
  type Quote,
  type QuoteParams,
  SDK
} from '@1inch/cross-chain-sdk'

import { type Quote as FusionQuote, type QuoteParams as FusionQuoteParams, FusionSDK, NetworkEnum, type OrderParams, type PreparedOrder } from '@1inch/fusion-sdk'
import type { Logger } from 'cat-logger'

import { randomBytes } from 'node:crypto'
import type { WalletClient } from 'viem'
import { createPublicClient, erc20Abi, http } from 'viem'
import type { Chain } from 'viem/chains'


export const createOneInchClient = (props: {
  walletClient: WalletClient;
  chain?: Chain;
  logger: Logger;
  authKey: string;
}) => {
  const { walletClient, logger, authKey } = props;

  const publicClient = createPublicClient({
    chain: props.chain || walletClient.chain,
    transport: http()
  });

  // Create blockchain provider connector
  const blockchainProvider: BlockchainProviderConnector = {
    async ethCall(contractAddress: string, callData: string) {
      logger.debug({ contractAddress, callData, msg: 'Calling contract' })
      const result = await publicClient.call({
        to: contractAddress as `0x${string}`,
        data: callData as `0x${string}`
      })
      if (!result.data) {
        throw new Error('No data returned from eth_call')
      }
      return result.data as unknown as string
    },
    async signTypedData(walletAddress, typedData) {
      logger.debug({ walletAddress, typedData, msg: 'Signing typed data' })
      return walletClient.signTypedData({
        account: walletAddress as `0x${string}`,
        domain: typedData.domain,
        types: typedData.types,
        message: typedData.message,
        primaryType: typedData.primaryType
      })
    }
  }

  const fusionSdk = new FusionSDK({
    url: "https://api.1inch.dev/fusion",
    network: NetworkEnum.COINBASE,
    blockchainProvider,
    authKey: authKey
  });

  // Add new methods for regular Fusion swaps
  const getFusionQuote = async (params: FusionQuoteParams): Promise<FusionQuote> => {
    try {
      const quote = await fusionSdk.getQuote(params)
      return quote
    } catch (error) {
      logger.error({
        error,
        msg: 'Failed to get 1inch Fusion quote'
      })
      throw error
    }
  }

  const executeFusionSwap = async (params: OrderParams): Promise<PreparedOrder> => {
    try {
      // Create and submit order
      const order = await fusionSdk.createOrder(params)
      logger.debug({ order, msg: 'Fusion order created' })
      return order
    } catch (error) {
      logger.error({
        error,
        msg: 'Failed to execute 1inch Fusion swap'
      })
      throw error
    }
  }

  const getFusionOrderStatus = async (orderHash: string) => {
    try {
      const status = await fusionSdk.getOrderStatus(orderHash)
      return status
    } catch (error) {
      logger.error({
        error,
        msg: 'Failed to get Fusion order status'
      })
      throw error
    }
  }

  // Initialize 1inch SDK
  const sdk = new SDK({
    url: "https://api.1inch.dev/fusion-plus",
    authKey,
    blockchainProvider,
  })

  const getQuote = async (props: QuoteParams): Promise<Quote> => {
    try {
      const quote = await sdk.getQuote(props)
      return quote
    } catch (error) {
      logger.error({
        error,
        msg: 'Failed to get 1inch quote'
      })
      throw error
    }
  }

  const executeCrossChainSwap = async (props: QuoteParams): Promise<string> => {
    try {
      // Get quote first
      const quote = await getQuote(props)

      const preset = PresetEnum.fast

      // Generate secrets
      const secrets = Array.from({
        length: quote.presets[preset].secretsCount
      }).map(() => `0x${randomBytes(32).toString('hex')}`)

      const hashLock =
        secrets.length === 1
          ? HashLock.forSingleFill(secrets[0])
          : HashLock.forMultipleFills(HashLock.getMerkleLeaves(secrets))

      const secretHashes = secrets.map((s) => HashLock.hashSecret(s))

      // Create order
      const { hash, quoteId, order } = await sdk.createOrder(quote, {
        walletAddress: props.walletAddress as `0x${string}`,
        hashLock,
        preset,
        source: 'cat-wallet',
        secretHashes
      })

      logger.debug({ hash }, 'Order created')

      // Submit order
      await sdk.submitOrder(
        quote.srcChainId,
        order,
        quoteId,
        secretHashes
      )

      logger.debug({ hash }, 'Order submitted')

      // Handle secrets submission in background
      await handleSecretsSubmission(hash, secrets).catch(error => {
        logger.error('Failed to submit secrets:', error)
      })

      return hash
    } catch (error) {
      const err = error as Error
      console.log("qq", JSON.stringify(err))
      logger.error({
        error,
        msg: 'Failed to execute 1inch swap'
      })
      throw error
    }
  }

  // Helper function to handle secrets submission
  const handleSecretsSubmission = async (hash: string, secrets: string[]) => {
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

    while (true) {
      try {
        const secretsToShare = await sdk.getReadyToAcceptSecretFills(hash)

        if (secretsToShare.fills.length) {
          for (const { idx } of secretsToShare.fills) {
            await sdk.submitSecret(hash, secrets[idx])
            logger.debug({ idx }, 'Shared secret')
          }
        }

        // Check if order finished
        const { status } = await sdk.getOrderStatus(hash)

        if (
          status === OrderStatus.Executed ||
          status === OrderStatus.Expired ||
          status === OrderStatus.Refunded
        ) {
          break
        }

        await sleep(1000)
      } catch (error) {
        logger.error('Error in secrets submission:', error)
        break
      }
    }
  }

  const approveToken = async (params: {
    tokenAddress: `0x${string}`,
    amount: bigint
  }) => {
    const { tokenAddress, amount } = params

    try {
      // 1inch router contract address
      const spenderAddress = '0x111111125421ca6dc452d289314280a0f8842a65' as const

      logger.debug({
        tokenAddress,
        spender: spenderAddress,
        amount: amount.toString(),
        msg: 'Approving token for 1inch'
      })

      if (!walletClient.account) {
        throw new Error('Wallet account is undefined')
      }

      const hash = await walletClient.writeContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'approve',
        args: [spenderAddress, amount],
        chain: walletClient.chain,
        account: walletClient.account
      })

      logger.debug({ hash, msg: 'Token approval transaction sent' })

      return hash
    } catch (error) {
      logger.error({
        error,
        msg: 'Failed to approve token for 1inch'
      })
      throw error
    }
  }

  return {
    getQuote,
    executeCrossChainSwap,
    getFusionQuote,
    executeFusionSwap,
    getFusionOrderStatus,
    approveToken
  }
}