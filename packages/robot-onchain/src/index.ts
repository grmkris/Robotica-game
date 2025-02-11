import { type Address, type Hash, createPublicClient, createWalletClient, http, parseEther } from "viem";
import { mnemonicToAccount } from 'viem/accounts';
import { type avalanche, mainnet } from 'viem/chains'; // Import appropriate chain
import { z } from "zod";
import { ROBOTICA_ABI } from "./robotica";

export type Mnemonic = `${string} ${string} ${string} ${string} ${string} ${string} ${string} ${string} ${string} ${string} ${string} ${string}`;
export const MnemonicSchema = z.custom<Mnemonic>()

export const AddressSchema = z.custom<Address>()

export type RoboticaOnchain = {
  // Core functions
  enterGame: (props: { signature: Address }) => Promise<Hash>;
  claimPrize: (props: { amount: bigint, signature: Address }) => Promise<Hash>;

  // Signature generation
  generateEnterGameSignature: () => Promise<Address>;
  generateClaimPrizeSignature: (amount: bigint) => Promise<Address>;

  // Utility functions
  getNonce: () => Promise<bigint>;
};

export const createRoboticaOnchain = (config: {
  mnemonic: Mnemonic;
  contractAddress: Address;
  chain?: typeof avalanche;
}): RoboticaOnchain => {
  // Create wallet client for transactions
  const walletClient = createWalletClient({
    account: mnemonicToAccount(config.mnemonic),
    chain: config.chain ?? mainnet,
    transport: http()
  });

  // Create public client for reading state
  const publicClient = createPublicClient({
    chain: config.chain ?? mainnet,
    transport: http()
  });

  // Get account address
  const account = mnemonicToAccount(config.mnemonic);

  const generateEnterGameSignature = async (): Promise<`0x${string}`> => {
    // Create message hash for entering game
    const messageHash = await walletClient.signMessage({
      account,
      message: `${account.address}ENTER${config.contractAddress}`
    });

    return messageHash;
  };

  const generateClaimPrizeSignature = async (amount: bigint): Promise<`0x${string}`> => {
    // Get current nonce
    const nonce = await publicClient.readContract({
      address: config.contractAddress,
      abi: ROBOTICA_ABI,
      functionName: 'getNonce',
      args: [account.address]
    });

    // Create message hash for claiming prize
    const messageHash = await walletClient.signMessage({
      account,
      message: `${account.address}${amount}CLAIM${config.contractAddress}${nonce}`
    });

    return messageHash;
  };

  const enterGame = async (props: { signature: `0x${string}` }): Promise<Hash> => {
    // Get entry fee from contract (not shown in current ABI)
    const entryFee = parseEther('0.1'); // Hardcoded for now, should read from contract

    // Simulate transaction first
    const { request } = await publicClient.simulateContract({
      address: config.contractAddress,
      abi: ROBOTICA_ABI,
      functionName: 'enterGame',
      args: [props.signature],
      account: account.address,
      value: entryFee
    });

    // Send transaction
    return walletClient.writeContract(request);
  };

  const claimPrize = async (props: { amount: bigint, signature: `0x${string}` }): Promise<Hash> => {
    // Simulate transaction first
    const { request } = await publicClient.simulateContract({
      address: config.contractAddress,
      abi: ROBOTICA_ABI,
      functionName: 'claimPrize',
      args: [props.amount, props.signature],
      account: account.address
    });

    // Send transaction
    return walletClient.writeContract(request);
  };

  const getNonce = async (): Promise<bigint> => {
    const result = await publicClient.readContract({
      address: config.contractAddress,
      abi: ROBOTICA_ABI,
      functionName: 'getNonce',
      args: [account.address]
    });

    return result;
  };

  return {
    enterGame,
    claimPrize,
    generateEnterGameSignature,
    generateClaimPrizeSignature,
    getNonce
  };
};
