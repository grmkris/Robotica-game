import { describe, expect, test } from 'bun:test';
import { createLogger } from 'cat-logger';
import { Mnemonic } from 'cat-sdk';
import { createPublicClient, createWalletClient, http } from 'viem';
import { mnemonicToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import { z } from 'zod';
import { createUniswapClient } from './uniswap';
const testSchema = z.object({
  TEST_MNEMONIC: Mnemonic,
});

const testEnv = testSchema.parse(process.env);
const logger = createLogger({
  name: 'uniswap-test',
  level: 'debug',
});

// Test tokens on Sepolia
const ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
const WETH = '0xfff9976782d46cc05630d1f6ebab18b2324d6b14';
const USDC = '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238';

// WARNING: Never use this private key for real funds - it's for testing only
const testAccount = mnemonicToAccount(testEnv.TEST_MNEMONIC);

describe('Uniswap Client', () => {
  // Create real clients for testing
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http()
  });

  const walletClient = createWalletClient({
    account: testAccount,
    chain: sepolia,
    transport: http()
  });

  describe('getQuote', () => {
    test('should return a valid quote for WETH to USDC', async () => {
      const client = createUniswapClient({
        walletClient,
        logger,
      });
      const amount = BigInt(1e12);

      const quote = await client.getQuote({
        tokenIn: WETH,
        tokenOut: USDC,
        amount,
      });

      // Verify quote structure
      expect(quote).toBeDefined();
      expect(quote.tokenIn).toEqual(expect.objectContaining({
        address: WETH,
        amount,
        decimals: expect.any(Number),
      }));

      expect(quote.tokenOut).toEqual(expect.objectContaining({
        address: USDC,
        amount: expect.any(BigInt),
        amountMin: expect.any(BigInt),
        decimals: expect.any(Number),
      }));

      expect(quote.priceImpact).toBeTypeOf('number');

      expect(quote.tokenIn.amount).toBe(amount);
      expect(quote.priceImpact).toBeGreaterThan(0);
    });

    test('should handle invalid token addresses', async () => {
      const client = createUniswapClient({
        walletClient,
        logger: logger,
      });
      const amount = BigInt(1e12);

      const invalidAddress = '0x1234567890123456789012345678901234567890';

      await expect(client.getQuote({
        tokenIn: invalidAddress as `0x${string}`,
        tokenOut: USDC,
        amount,
      })).rejects.toThrow();
    });

    test('should handle zero amount', async () => {
      const client = createUniswapClient({
        walletClient,
        logger: logger,
      });

      await expect(client.getQuote({
        tokenIn: WETH as `0x${string}`,
        tokenOut: USDC as `0x${string}`,
        amount: BigInt(0),
      })).rejects.toThrow();
    });
  });

  describe('executeTrade', () => {
    test('should execute ETH to WETH wrap', async () => {
      const client = createUniswapClient({
        walletClient,
        logger: logger,
      });

      const amount = BigInt(1e15); // 0.001 ETH
      const txHash = await client.executeTrade({
        tokenIn: ETH_ADDRESS,
        tokenOut: WETH,
        amount,
      });

      expect(txHash).toMatch(/^0x[a-fA-F0-9]{64}$/);

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash as `0x${string}`
      });
      expect(receipt.status).toBe('success');
    }, 100000);

    test('should execute WETH to ETH unwrap', async () => {
      const client = createUniswapClient({
        walletClient,
        logger: logger,
      });

      const amount = BigInt(1e13); // 0.001 WETH
      const txHash = await client.executeTrade({
        tokenIn: WETH,
        tokenOut: ETH_ADDRESS,
        amount,
      });

      expect(txHash).toMatch(/^0x[a-fA-F0-9]{64}$/);

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash as `0x${string}`
      });
      expect(receipt.status).toBe('success');
    }, 100000);

    test('should execute WETH to USDC swap', async () => {
      const client = createUniswapClient({
        walletClient,
        logger: logger,
      });

      // Now execute the WETH to USDC swap
      const amount = BigInt(1e12);
      const txHash = await client.executeTrade({
        tokenIn: WETH,
        tokenOut: USDC,
        amount,
      });

      expect(txHash).toMatch(/^0x[a-fA-F0-9]{64}$/);

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash as `0x${string}`
      });
      expect(receipt.status).toBe('success');
    }, 300000); // Increase timeout to 5 minutes

    test('should handle insufficient balance', async () => {
      const client = createUniswapClient({
        walletClient,
        logger: logger,
      });

      const largeAmount = BigInt(1e30); // Unrealistically large amount

      await expect(client.executeTrade({
        tokenIn: WETH as `0x${string}`,
        tokenOut: USDC as `0x${string}`,
        amount: largeAmount,
      })).rejects.toThrow();
    }, 1000000);
  });
}); 