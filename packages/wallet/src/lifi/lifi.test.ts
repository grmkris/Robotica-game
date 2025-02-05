import { describe, expect, it } from 'bun:test';
import { createLogger } from 'cat-logger';
import { Mnemonic } from 'cat-sdk';
import { createWalletClient, http, parseEther } from 'viem';
import { mnemonicToAccount } from 'viem/accounts';
import { base, sepolia } from 'viem/chains';
import { z } from 'zod';
import { createLifiClient } from './lifi';
import type { SwapQuoteInput } from './lifi.schemas';
const testSchema = z.object({
  TEST_MNEMONIC: Mnemonic,
  LIFI_API_KEY: z.string(),
  LIFI_INTEGRATOR: z.string(),
});

const testEnv = testSchema.parse(process.env);
const logger = createLogger({
  name: 'lifi-test',
  level: 'debug',
});

describe('LIFI Swap Client', () => {
  // Create a test wallet using a private key
  // WARNING: Never use this private key for real funds - it's for testing only
  const testAccount = mnemonicToAccount(testEnv.TEST_MNEMONIC);

  const walletClient = createWalletClient({
    account: testAccount,
    chain: base,
    transport: http()
  });

  describe('getQuote', () => {
    it('should return a valid quote', async () => {
      const testQuoteParams: SwapQuoteInput = {
        fromChainId: 8453, // Base
        toChainId: 8453, // Base
        // WETH on Base
        fromTokenAddress: '0x4200000000000000000000000000000000000006' as `0x${string}`,
        // USDC on Sepolia  
        toTokenAddress: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913' as `0x${string}`,
        fromAmount: parseEther('0.01').toString(),
        slippage: 0.005,
      };
      const swapClient = createLifiClient({
        walletClient,
        logger,
        apiKey: testEnv.LIFI_API_KEY,
        integrator: testEnv.LIFI_INTEGRATOR,
      });
      const quote = await swapClient.getQuote(testQuoteParams);

      expect(quote.estimate).toBeDefined();
      expect(quote.estimate.fromAmount).toBe(testQuoteParams.fromAmount);
      expect(quote.estimate.toAmount).toBeDefined();
      expect(quote.transactionRequest).toBeDefined();
    });

    it('should throw error when wallet address is not set', async () => {
      const testQuoteParams: SwapQuoteInput = {
        fromChainId: 8453, // Base
        toChainId: 8453, // Base
        // WETH on Base
        fromTokenAddress: '0x4200000000000000000000000000000000000006' as `0x${string}`,
        // USDC on Sepolia  
        toTokenAddress: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913' as `0x${string}`,
        fromAmount: parseEther('0.01').toString(),
        slippage: 0.005,
      };
      const invalidWalletClient = createWalletClient({
        chain: sepolia,
        transport: http('https://rpc.sepolia.org')
      });

      const swapClient = createLifiClient({
        walletClient: invalidWalletClient,
        logger,
        apiKey: testEnv.LIFI_API_KEY,
        integrator: testEnv.LIFI_INTEGRATOR,
      });
      await expect(swapClient.getQuote(testQuoteParams)).rejects.toThrow('Wallet address is not set');
    });
  });

  describe('executeQuote', () => {
    it('should execute a quote', async () => {
      const testQuoteParams: SwapQuoteInput = {
        fromChainId: 8453, // Base
        toChainId: 8453, // Base
        // WETH on Base
        fromTokenAddress: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913' as `0x${string}`,
        // USDC on Sepolia  
        toTokenAddress: '0x4200000000000000000000000000000000000006' as `0x${string}`,
        // 0.000001 USDC
        fromAmount: '10000',
        slippage: 0.005,
      };
      const swapClient = createLifiClient({
        walletClient,
        logger,
        apiKey: testEnv.LIFI_API_KEY,
        integrator: testEnv.LIFI_INTEGRATOR,
      });
      const quote = await swapClient.getQuote(testQuoteParams);

      // We're just validating the quote structure here without executing
      expect(quote.transactionRequest?.to).toBeTruthy();
      expect(quote.transactionRequest?.data).toBeTruthy();

      const executed = await swapClient.executeQuote(quote);
      logger.info({ msg: "executed", executed })
    }, 100000);
  });

  describe('getTokens', () => {
    it('should return tokens for specified chains', async () => {
      const swapClient = createLifiClient({
        walletClient,
        logger,
        apiKey: testEnv.LIFI_API_KEY,
        integrator: testEnv.LIFI_INTEGRATOR,
      });
      const tokens = await swapClient.getTokens({ chains: [8453] }); // Base chain

      expect(tokens).toBeDefined();
      expect(tokens[8453]).toBeDefined();
      expect(Array.isArray(tokens[8453])).toBe(true);

      // Check token structure
      const firstToken = tokens[8453][0];
      expect(firstToken).toHaveProperty('address');
      expect(firstToken).toHaveProperty('symbol');
      expect(firstToken).toHaveProperty('decimals');
      expect(firstToken).toHaveProperty('name');
      expect(firstToken).toHaveProperty('chainId');
    });

    it('should return tokens without chain parameter', async () => {
      const swapClient = createLifiClient({
        walletClient,
        logger,
        apiKey: testEnv.LIFI_API_KEY,
        integrator: testEnv.LIFI_INTEGRATOR,
      });
      const tokens = await swapClient.getTokens();

      expect(tokens).toBeDefined();
      expect(Object.keys(tokens).length).toBeGreaterThan(0);
    });
  });

  describe('getConnections', () => {
    it('should return valid connections between chains', async () => {
      const swapClient = createLifiClient({
        walletClient,
        logger,
        apiKey: testEnv.LIFI_API_KEY,
        integrator: testEnv.LIFI_INTEGRATOR,
      });
      const connections = await swapClient.getConnections({
        fromChain: 8453, // Base
        toChain: 8453, // Ethereum
      });

      expect(connections).toBeDefined();
      expect(connections.connections).toBeDefined();
      expect(Array.isArray(connections.connections)).toBe(true);

      if (connections.connections.length > 0) {
        const firstConnection = connections.connections[0];
        expect(firstConnection).toHaveProperty('fromChainId');
        expect(firstConnection).toHaveProperty('toChainId');
        expect(firstConnection).toHaveProperty('fromTokenAddress');
        expect(firstConnection).toHaveProperty('toTokenAddress');
      }
      logger.info({
        msg: 'connections',
        connections,
      });
    });

    it('should return connections with specific tokens', async () => {
      const swapClient = createLifiClient({
        walletClient,
        logger,
        apiKey: testEnv.LIFI_API_KEY,
        integrator: testEnv.LIFI_INTEGRATOR,
      });
      const connections = await swapClient.getConnections({
        fromChain: 8453,
        fromToken: '0x4200000000000000000000000000000000000006', // WETH on Base
        toChain: 8453,
        toToken: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', // USDC on Base
      });

      logger.info({
        msg: 'connections',
        connections,
      });

      expect(connections).toBeDefined();
      expect(connections.connections).toBeDefined();
      expect(Array.isArray(connections.connections)).toBe(true);
    }, 10000);
  });
});
