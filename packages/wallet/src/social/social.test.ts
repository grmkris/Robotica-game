import { describe, expect, it } from 'bun:test';
import { createLogger } from 'cat-logger';
import { Mnemonic } from 'cat-sdk';
import { z } from 'zod';
import { createCatWalletClient } from '..';

const testSchema = z.object({
  TEST_MNEMONIC: Mnemonic,
});

const testEnv = testSchema.parse(process.env);
const logger = createLogger({
  name: 'social-test',
  level: 'debug',
});

describe('Social Client', () => {

  describe('Wallet', () => {
    // Create a test wallet using the mnemonic
    const catWallet = createCatWalletClient({
      mnemonic: testEnv.TEST_MNEMONIC,
      chainId: 84532,
      logger,
    });
    it('should create a wallet client', () => {
      const address = catWallet.getAddress();
      logger.info({
        msg: 'wallet address',
        address,
      });
      expect(address).toBeDefined();
    });
  });

  describe('Basename Registration', () => {
    // Create a test wallet using the mnemonic
    const catWallet = createCatWalletClient({
      mnemonic: testEnv.TEST_MNEMONIC,
      chainId: 84532,
      logger,
    });
    it('should validate basename registration parameters', async () => {
      const address = catWallet.getAddress();

      expect(address).toBeDefined();
      expect(catWallet.social.registerEns).toBeDefined();
    });

    // Skip actual registration test as it requires real funds/network
    it('should register a basename', async () => {
      const randomNumber = Math.floor(Math.random() * 1000000);
      const basename = `catmisha${randomNumber}.base`;

      const tx = await catWallet.social.registerBasename({
        basename,
        chainId: 84532,
      });

      expect(tx).toBeDefined();
      logger.info({
        msg: 'basename registration transaction',
        tx,
      });
    }, 100000);

  });

  // Add ENS registration tests if needed
  describe('ENS Registration', () => {
    // Create a test wallet using the mnemonic
    const catWallet = createCatWalletClient({
      mnemonic: testEnv.TEST_MNEMONIC,
      chainId: 11155111,
      logger,
    });
    it('should register an ENS name', async () => {
      const randomNumber = Math.floor(Math.random() * 1000000);
      const ensName = `catmisha${randomNumber}.eth`;
      const address = catWallet.getAddress();

      expect(address).toBeDefined();
      expect(catWallet.social.registerEns).toBeDefined();

      const tx = await catWallet.social.registerEns({
        ensName,
      });

      expect(tx).toBeDefined();
      logger.info({
        msg: 'ENS registration transaction',
        tx,
      });
    }, 1000000);

    it('should register an ENS subdomain', async () => {
      const parentDomain = "catmisha.eth";
      const subdomain = 'sub';
      const address = catWallet.getAddress();

      expect(address).toBeDefined();
      expect(catWallet.social.registerEnsSubdomain).toBeDefined();

      const tx = await catWallet.social.registerEnsSubdomain({
        ensName: parentDomain,
        subdomain,
        address,
      });

      expect(tx).toBeDefined();
      logger.info({
        msg: 'ENS subdomain registration transaction',
        tx,
      });
    }, 1000000);
  });
});