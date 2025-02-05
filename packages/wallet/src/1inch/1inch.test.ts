import { describe, it } from 'bun:test'

import { createLogger } from 'cat-logger'
import { createWalletClient, http } from 'viem'
import { mnemonicToAccount } from 'viem/accounts'
import { base } from 'viem/chains'
import { z } from 'zod'
import { createOneInchClient } from './1inch'


const envSchema = z.object({
  ONE_INCH_AUTH_KEY: z.string(),
  TEST_MNEMONIC: z.string()
})

const env = envSchema.parse(process.env)

const logger = createLogger({
  name: '1inch',
  level: 'debug'
})

describe('1inch', () => {
  const walletClient = createWalletClient({
    account: mnemonicToAccount(env.TEST_MNEMONIC),
    transport: http(),
    chain: base
  })
  const client = createOneInchClient({
    authKey: env.ONE_INCH_AUTH_KEY,
    chain: base,
    walletClient,
    logger: logger
  })
  it('should execute a swap', async () => {
    const swap = await client.getFusionQuote({
      fromTokenAddress: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", // USDC
      toTokenAddress: "0x4200000000000000000000000000000000000006", // WETH
      amount: "10000000000000000",
      walletAddress: walletClient.account.address,
      source: "mishacat"
    })

    const approval = await client.approveToken({
      tokenAddress: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", // USDC
      amount: BigInt(10000000000000000000000),
    })

    logger.info({ swap, approval })
    const order = await client.executeFusionSwap({
      fromTokenAddress: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", // USDC
      toTokenAddress: "0x4200000000000000000000000000000000000006", // WETH
      amount: "10000000000000000",
      walletAddress: walletClient.account.address,
      source: "mishacat"
    })
    logger.info({ order })
  }, 1000000)
})
