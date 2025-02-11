import { createPublicClient, createWalletClient, encodePacked, http, keccak256, type Address, type Hash } from "viem";
import { mnemonicToAccount } from 'viem/accounts';
import type { avalanche } from 'viem/chains'; // Import appropriate chain
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
  generateEnterGameSignature: (props: { user: Address }) => Promise<Address>;
  generateClaimPrizeSignature: (props: { amount: bigint, user: Address }) => Promise<Address>;

  // Utility functions
  getNonce: () => Promise<bigint>;
  getEntryFee: () => Promise<bigint>;
  getSignerAddress: () => Promise<Address>;
};

export const createRoboticaOnchain = (config: {
  mnemonic: Mnemonic;
  contractAddress: Address;
  chain: typeof avalanche;
}): RoboticaOnchain => {
  // Create wallet client for transactions
  const walletClient = createWalletClient({
    account: mnemonicToAccount(config.mnemonic),
    chain: config.chain,
    transport: http("https://avalanche-mainnet.infura.io/v3/28WCp5SV03K0Sk7cQGzJDXgAp7u")
  });

  // Create public client for reading state
  const publicClient = createPublicClient({
    chain: config.chain,
    transport: http("https://avalanche-mainnet.infura.io/v3/28WCp5SV03K0Sk7cQGzJDXgAp7u")
  });

  // Get account address
  const account = mnemonicToAccount(config.mnemonic);

  const generateEnterGameSignature = async (props: { user: Address }): Promise<`0x${string}`> => {
    // Create message hash for entering game - match the contract's encoding
    const encodedMessage = keccak256(encodePacked(
      ['address', 'string', 'address'],
      [props.user, 'ENTER', config.contractAddress]
    ));

    console.log(encodedMessage);

    // Sign the message directly, not the hash
    const signature = await walletClient.signMessage({
      account,
      message: { raw: encodedMessage } // Changed: Sign the encoded message, not its hash
    });

    return signature;
  };

  const generateClaimPrizeSignature = async (props: { amount: bigint, user: Address }): Promise<`0x${string}`> => {
    // Get current nonce
    const nonce = await publicClient.readContract({
      address: config.contractAddress,
      abi: ROBOTICA_ABI,
      functionName: 'getNonce',
      args: [account.address]
    });

    // Create message hash for claiming prize - match the contract's encoding
    const encodedMessage = keccak256(encodePacked(
      ['address', 'uint256', 'string', 'address', 'uint256'],
      [props.user, props.amount, 'CLAIM', config.contractAddress, nonce]
    ));
    // Sign the message directly
    const signature = await walletClient.signMessage({
      account,
      message: { raw: encodedMessage } // Changed: Sign the encoded message, not its hash
    });

    return signature;
  };

  const enterGame = async (props: { signature: `0x${string}` }): Promise<Hash> => {
    // Read entry fee from contract
    const entryFee = await publicClient.readContract({
      address: config.contractAddress,
      abi: ROBOTICA_ABI,
      functionName: 'entryFee',
    });

    // Send transaction
    return walletClient.writeContract({
      address: config.contractAddress,
      abi: ROBOTICA_ABI,
      functionName: 'enterGame',
      args: [props.signature],
      account: account,
      value: entryFee // Use the actual entry fee from contract
    });
  };

  const claimPrize = async (props: { amount: bigint, signature: `0x${string}` }): Promise<Hash> => {
    // Simulate transaction first
    const { request } = await publicClient.simulateContract({
      address: config.contractAddress,
      abi: ROBOTICA_ABI,
      functionName: 'claimPrize',
      args: [props.amount, props.signature],
      account: account
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

  const getEntryFee = async (): Promise<bigint> => {
    return publicClient.readContract({
      address: config.contractAddress,
      abi: ROBOTICA_ABI,
      functionName: 'entryFee',
    });
  };


  const getSignerAddress = async (): Promise<Address> => {
    return publicClient.readContract({
      address: config.contractAddress,
      abi: ROBOTICA_ABI,
      functionName: 'signerAddress',
    });
  };


  return {
    enterGame,
    claimPrize,
    generateEnterGameSignature,
    generateClaimPrizeSignature,
    getNonce,
    getEntryFee,
    getSignerAddress
  };
};
