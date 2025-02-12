import { describe, expect, it } from "bun:test";
import { createWalletClient, http, parseEther } from "viem";
import { mnemonicToAccount } from "viem/accounts";
import { avalanche } from "viem/chains";
import { z } from "zod";
import { AddressSchema, MnemonicSchema, createRoboticaOnchain } from ".";

const testEnvSchema = z.object({
  SIGNER_MNEMONIC: MnemonicSchema,
  PLAYER1_MNEMONIC: MnemonicSchema,
  PLAYER2_MNEMONIC: MnemonicSchema,
  CONTRACT_ADDRESS: AddressSchema,
});

const testEnv = testEnvSchema.parse(process.env);

// Create wallet clients for different roles
const signerAccount = mnemonicToAccount(testEnv.SIGNER_MNEMONIC);
const player1Account = mnemonicToAccount(testEnv.PLAYER1_MNEMONIC);
const player2Account = mnemonicToAccount(testEnv.PLAYER2_MNEMONIC);

const createTestWalletClient = (account: typeof signerAccount) => {
  return createWalletClient({
    account,
    chain: avalanche,
    transport: http()
  });
};

// Create instances for different roles
const signer = createRoboticaOnchain({
  walletClient: createTestWalletClient(signerAccount),
  contractAddress: testEnv.CONTRACT_ADDRESS,
  chain: avalanche,
});

const player1 = createRoboticaOnchain({
  walletClient: createTestWalletClient(player1Account),
  contractAddress: testEnv.CONTRACT_ADDRESS,
  chain: avalanche,
});

const player2 = createRoboticaOnchain({
  walletClient: createTestWalletClient(player2Account),
  contractAddress: testEnv.CONTRACT_ADDRESS,
  chain: avalanche,
});

// Helper function to get addresses
const getAddresses = () => {
  return {
    signer: signerAccount.address,
    player1: player1Account.address,
    player2: player2Account.address,
  };
};

describe('Robotica Onchain', () => {
  const addresses = getAddresses();

  it('should have correct addresses for all entities', () => {
    expect(addresses.signer).toBeDefined();
    expect(addresses.player1).toBeDefined();
    expect(addresses.player2).toBeDefined();

    // Verify addresses are different
    expect(addresses.signer).not.toBe(addresses.player1);
    expect(addresses.signer).not.toBe(addresses.player2);
    expect(addresses.player1).not.toBe(addresses.player2);

    console.log(addresses);
  });

  describe('Game Entry', () => {

    it('should get signer address', async () => {
      const signerAddress = await signer.getSignerAddress();
      expect(signerAddress).toBeTypeOf('string');
      expect(signerAddress).toStartWith('0x');
      console.log(signerAddress);
    });

    it('should get entry fee', async () => {
      const entryFee = await player1.getEntryFee();
      expect(entryFee).toBeTypeOf('bigint');
      expect(entryFee).toBeGreaterThan(0n);
      console.log(entryFee);
    });

    it('should generate valid enter game signature', async () => {
      const gameId = 1n;
      // Generate signature using signer (server authority)
      const signature = await signer.generateEnterGameSignature({ user: addresses.player1, gameId });
      expect(signature).toBeTypeOf('string');
      expect(signature).toStartWith('0x');
    });

    it('should allow player to enter game', async () => {
      const gameId = 1n;
      // Generate signature using signer (server authority)
      const signature = await signer.generateEnterGameSignature({ user: addresses.player1, gameId });
      // Player uses the signature to enter
      const tx = await player1.enterGame({ gameId, signature });
      expect(tx).toBeTypeOf('string');
      expect(tx).toStartWith('0x');
    }, 20000000);
  });

  describe('Prize Claiming', () => {
    it('should generate valid claim prize signature', async () => {
      const amount = parseEther('0.001');
      const gameId = 1n;
      const signature = await signer.generateClaimPrizeSignature({ amount, user: addresses.player1, gameId });
      expect(signature).toBeTypeOf('string');
      expect(signature).toStartWith('0x');
    });

    it('should get correct nonce for player', async () => {
      const nonce = await signer.getNonce();
      expect(nonce).toBeTypeOf('bigint');
      expect(nonce).toBeGreaterThanOrEqual(0n);
    });

    it('should allow player to claim prize', async () => {
      const amount = parseEther('0.001');
      const gameId = 1n;
      const signature = await signer.generateClaimPrizeSignature({ amount, user: addresses.player1, gameId });
      const tx = await player1.claimPrize({ amount, gameId, signature });
      expect(tx).toBeTypeOf('string');
      expect(tx).toStartWith('0x');
    }, 20000000);
  });

  describe('Error Cases', () => {
    it('should fail when using another player\'s signature', async () => {
      const gameId = 1n;
      // Generate signature for player1
      const signature = await player1.generateEnterGameSignature({ user: addresses.player1, gameId });

      // Try to use it with player2
      await expect(
        player2.enterGame({ gameId: 1n, signature })
      ).rejects.toThrow();
    });

    it('should fail when claiming with invalid amount', async () => {
      const amount = parseEther('0.1');
      const gameId = 1n;
      const signature = await player1.generateClaimPrizeSignature({ amount, user: addresses.player1, gameId });

      // Try to claim different amount with same signature
      const wrongAmount = parseEther('0.2');
      await expect(
        player1.claimPrize({ amount: wrongAmount, gameId: 1n, signature })
      ).rejects.toThrow();
    });

    it('should fail when reusing signatures', async () => {
      const gameId = 1n;
      const signature = await player1.generateEnterGameSignature({ user: addresses.player1, gameId });

      // First entry should succeed
      await player1.enterGame({ gameId: 1n, signature });

      // Second entry with same signature should fail
      await expect(
        player1.enterGame({ gameId: 1n, signature })
      ).rejects.toThrow();
    });
  });
});