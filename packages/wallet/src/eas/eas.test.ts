import { describe, expect, test } from 'bun:test';
import { createLogger } from 'cat-logger';
import { Mnemonic } from 'cat-sdk';
import { createPublicClient, createWalletClient, http } from 'viem';
import { mnemonicToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import { z } from 'zod';
import { createEasClient } from './eas';

const testSchema = z.object({
  TEST_MNEMONIC: Mnemonic,
});

const testEnv = testSchema.parse(process.env);
const logger = createLogger({
  name: 'eas-test',
  level: 'debug',
});

// WARNING: Never use this private key for real funds - it's for testing only
const testAccount = mnemonicToAccount(testEnv.TEST_MNEMONIC);

describe('EAS Client', () => {
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

  describe('registerSchemaWithMetadata', () => {
    test.only('should register a new schema with metadata', async () => {
      const client = createEasClient({
        walletClient,
        publicClient,
      });

      const schemaParams = {
        name: "Test Profile Schema",
        description: "A schema for testing profile attestations",
        schema: "string name, uint256 age, string email",
        context: "https://schema.org/Person",
      };

      const result = await client.registerSchemaWithMetadata(schemaParams);

      // Verify schema registration response structure
      expect(result).toBeDefined();
      expect(result.schemaUID).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(result.transaction).toMatch(/^0x[a-fA-F0-9]{64}$/);

      // Verify metadata transactions
      expect(result.metadataTransactions).toBeDefined();
      expect(result.metadataTransactions.name).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(result.metadataTransactions.description).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(result.metadataTransactions.context).toMatch(/^0x[a-fA-F0-9]{64}$/);

      // Verify transaction success
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: result.transaction as `0x${string}`
      });
      expect(receipt.status).toBe('success');

      // Verify metadata transactions success
      if (result.metadataTransactions.name) {
        const nameReceipt = await publicClient.waitForTransactionReceipt({
          hash: result.metadataTransactions.name as `0x${string}`
        });
        expect(nameReceipt.status).toBe('success');
      }

      if (result.metadataTransactions.description) {
        const descriptionReceipt = await publicClient.waitForTransactionReceipt({
          hash: result.metadataTransactions.description as `0x${string}`
        });
        expect(descriptionReceipt.status).toBe('success');
      }

      if (result.metadataTransactions.context) {
        const contextReceipt = await publicClient.waitForTransactionReceipt({
          hash: result.metadataTransactions.context as `0x${string}`
        });
        expect(contextReceipt.status).toBe('success');
      }
    }, 300000); // 5 minute timeout since we're making multiple transactions

    test('should handle invalid schema string', async () => {
      const client = createEasClient({
        walletClient,
        publicClient,
      });

      const invalidSchemaParams = {
        name: "Invalid Schema",
        description: "This schema has invalid types",
        schema: "invalid type name, wrong uint256 age", // Invalid schema string
        context: "https://schema.org/Person",
      };

      await expect(client.registerSchemaWithMetadata(invalidSchemaParams))
        .rejects.toThrow();
    });

    test('should register schema without optional metadata', async () => {
      const client = createEasClient({
        walletClient,
        publicClient,
      });

      const minimalSchemaParams = {
        name: "", // Empty name
        description: "", // Empty description
        schema: "string name, uint256 age", // Valid schema
        context: "", // Empty context
      };

      const result = await client.registerSchemaWithMetadata(minimalSchemaParams);

      // Verify basic schema registration
      expect(result.schemaUID).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(result.transaction).toMatch(/^0x[a-fA-F0-9]{64}$/);

      // Verify no metadata transactions were created
      expect(result.metadataTransactions.name).toBeUndefined();
      expect(result.metadataTransactions.description).toBeUndefined();
      expect(result.metadataTransactions.context).toBeUndefined();

      // Verify transaction success
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: result.transaction as `0x${string}`
      });
      expect(receipt.status).toBe('success');
    }, 100000);

    test('should handle schema registration with resolver', async () => {
      const client = createEasClient({
        walletClient,
        publicClient,
      });

      const schemaWithResolverParams = {
        name: "Resolver Schema",
        description: "Schema with custom resolver",
        schema: "string name, uint256 age",
        context: "https://schema.org/Person",
        resolverAddress: "0x1234567890123456789012345678901234567890", // Custom resolver
        revocable: false, // Make it non-revocable
      };

      const result = await client.registerSchemaWithMetadata(schemaWithResolverParams);

      expect(result.schemaUID).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(result.transaction).toMatch(/^0x[a-fA-F0-9]{64}$/);

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: result.transaction as `0x${string}`
      });
      expect(receipt.status).toBe('success');
    }, 100000);
  });
});
