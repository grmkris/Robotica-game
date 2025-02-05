import { describe, expect, it } from 'bun:test';
import { createLogger } from 'cat-logger';
import { createWalletClient, http } from 'viem';
import { mnemonicToAccount } from 'viem/accounts';
import { optimism } from 'viem/chains';
import { z } from 'zod';
import { createFarcasterClient } from './farcaster';

const testEnvSchema = z.object({
  TEST_MNEMONIC: z.string(),
  HUB_URL: z.string(),
  HUB_USERNAME: z.string(),
  HUB_PASS: z.string(),
})

const testEnv = testEnvSchema.parse(process.env);
const logger = createLogger({
  name: 'farcaster-test',
});

describe('Farcaster', () => {
  const account = mnemonicToAccount(testEnv.TEST_MNEMONIC);
  const walletClient = createWalletClient({
    account,
    transport: http(),
    chain: optimism,
  });

  it('should get or register a fid', async () => {
    const { getOrRegisterFid } = await createFarcasterClient({
      walletClient,
      logger,
      hubUrl: testEnv.HUB_URL,
      hubUsername: testEnv.HUB_USERNAME,
      hubPass: testEnv.HUB_PASS,
    });
    const fid = await getOrRegisterFid();
    expect(fid).toBeGreaterThan(0);
  });
});

