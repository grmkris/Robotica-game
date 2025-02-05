import { describe, expect, it } from 'bun:test';
import { Mnemonic } from 'cat-sdk';
import { z } from 'zod';
import { createCatWalletClient } from '.';

const testSchema = z.object({
  TEST_MNEMONIC: Mnemonic,
});

import { createLogger } from 'cat-logger';

const logger = createLogger({
  name: 'wallet-test',
});

describe('Wallet', () => {
  const testEnv = testSchema.parse(process.env);
  it('should create a wallet client', () => {
    const wallet = createCatWalletClient({
      mnemonic: testEnv.TEST_MNEMONIC,
      chainId: 8453,
      logger,
    });

    const address = wallet.getAddress();
    console.log('address', address);
    expect(address).toBeDefined();
  });
});