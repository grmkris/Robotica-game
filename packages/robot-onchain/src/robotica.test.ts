import { describe, expect, it } from "bun:test";
import { parseEther } from "viem";
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

// Create instances for different roles
const signer = createRoboticaOnchain({
  mnemonic: testEnv.SIGNER_MNEMONIC,
  contractAddress: testEnv.CONTRACT_ADDRESS,
  chain: avalanche,
});

const player1 = createRoboticaOnchain({
  mnemonic: testEnv.PLAYER1_MNEMONIC,
  contractAddress: testEnv.CONTRACT_ADDRESS,
  chain: avalanche,
});

const player2 = createRoboticaOnchain({
  mnemonic: testEnv.PLAYER2_MNEMONIC,
  contractAddress: testEnv.CONTRACT_ADDRESS,
  chain: avalanche,
});

// Helper function to get addresses
const getAddresses = () => {
  const signerAddress = mnemonicToAccount(testEnv.SIGNER_MNEMONIC).address;
  const player1Address = mnemonicToAccount(testEnv.PLAYER1_MNEMONIC).address;
  const player2Address = mnemonicToAccount(testEnv.PLAYER2_MNEMONIC).address;

  return {
    signer: signerAddress,
    player1: player1Address,
    player2: player2Address,
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
    it('should generate valid enter game signature', async () => {
      const signature = await player1.generateEnterGameSignature();
      expect(signature).toBeTypeOf('string');
      expect(signature).toStartWith('0x');
    });

    it('should allow player to enter game', async () => {
      const signature = await player1.generateEnterGameSignature();
      const tx = await player1.enterGame({ signature });
      expect(tx).toBeTypeOf('string');
      expect(tx).toStartWith('0x');
    });
  });

  describe('Prize Claiming', () => {
    it('should generate valid claim prize signature', async () => {
      const amount = parseEther('0.1');
      const signature = await player1.generateClaimPrizeSignature(amount);
      expect(signature).toBeTypeOf('string');
      expect(signature).toStartWith('0x');
    });

    it('should get correct nonce for player', async () => {
      const nonce = await player1.getNonce();
      expect(nonce).toBeTypeOf('bigint');
      expect(nonce).toBeGreaterThanOrEqual(0n);
    });

    it('should allow player to claim prize', async () => {
      const amount = parseEther('0.1');
      const signature = await player1.generateClaimPrizeSignature(amount);
      const tx = await player1.claimPrize({ amount, signature });
      expect(tx).toBeTypeOf('string');
      expect(tx).toStartWith('0x');
    });
  });

  describe('Error Cases', () => {
    it('should fail when using another player\'s signature', async () => {
      // Generate signature for player1
      const signature = await player1.generateEnterGameSignature();

      // Try to use it with player2
      await expect(
        player2.enterGame({ signature })
      ).rejects.toThrow();
    });

    it('should fail when claiming with invalid amount', async () => {
      const amount = parseEther('0.1');
      const signature = await player1.generateClaimPrizeSignature(amount);

      // Try to claim different amount with same signature
      const wrongAmount = parseEther('0.2');
      await expect(
        player1.claimPrize({ amount: wrongAmount, signature })
      ).rejects.toThrow();
    });

    it('should fail when reusing signatures', async () => {
      const signature = await player1.generateEnterGameSignature();

      // First entry should succeed
      await player1.enterGame({ signature });

      // Second entry with same signature should fail
      await expect(
        player1.enterGame({ signature })
      ).rejects.toThrow();
    });
  });
});