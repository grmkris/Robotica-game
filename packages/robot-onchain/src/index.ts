import {
  createPublicClient,
  type Chain,
  encodePacked,
  http,
  keccak256,
  type Address,
  type Hash,
  type WalletClient,
} from "viem";
import { z } from "zod";
import { ROBOTICA_ABI } from "./robotica";

export type Mnemonic =
  `${string} ${string} ${string} ${string} ${string} ${string} ${string} ${string} ${string} ${string} ${string} ${string}`;
export const MnemonicSchema = z.custom<Mnemonic>();

export const AddressSchema = z.custom<Address>();

export type RoboticaOnchain = {
  // Core functions
  enterGame: (props: { gameId: bigint; signature: Address }) => Promise<Hash>;
  claimPrize: (props: {
    amount: bigint;
    gameId: bigint;
    signature: Address;
  }) => Promise<Hash>;

  // Signature generation
  generateEnterGameSignature: (props: {
    user: Address;
    gameId: bigint;
  }) => Promise<Address>;
  generateClaimPrizeSignature: (props: {
    amount: bigint;
    user: Address;
    gameId: bigint;
  }) => Promise<Address>;

  // Utility functions
  getNonce: () => Promise<bigint>;
  getEntryFee: () => Promise<bigint>;
  getSignerAddress: () => Promise<Address>;
};

export const createRoboticaOnchain = ({
  walletClient,
  contractAddress,
  chain,
}: {
  walletClient: WalletClient;
  contractAddress: `0x${string}`;
  chain: Chain;
}) => {
  // Create public client for reading state
  const publicClient = createPublicClient({
    chain: chain,
    transport: http(process.env.AVALANCHE_RPC_URL),
  });

  // Get account from wallet client
  const account = walletClient.account;
  if (!account) throw new Error("Wallet client must have an account");

  const generateEnterGameSignature = async ({
    user,
    gameId,
  }: {
    user: `0x${string}`;
    gameId: bigint;
  }): Promise<`0x${string}`> => {
    // Add debug logging
    console.log("Generating enter game signature", { user, gameId });

    // Get current nonce
    const nonce = await publicClient.readContract({
      address: contractAddress,
      abi: ROBOTICA_ABI,
      functionName: "getNonce",
      args: [user],
    });

    // Create message hash for entering game - match the contract's encoding
    const encodedMessage = keccak256(
      encodePacked(
        ["address", "uint256", "string", "address", "uint256"],
        [user, gameId, "ENTER", contractAddress, nonce]
      )
    );

    // Sign the message
    const signature = await walletClient.signMessage({
      account,
      message: { raw: encodedMessage },
    });

    return signature;
  };

  const generateClaimPrizeSignature = async (props: {
    amount: bigint;
    user: Address;
    gameId: bigint;
  }): Promise<`0x${string}`> => {
    // Get current nonce
    const nonce = await publicClient.readContract({
      address: contractAddress,
      abi: ROBOTICA_ABI,
      functionName: "getNonce",
      args: [props.user],
    });

    // Create message hash for claiming prize - match the contract's encoding
    const encodedMessage = keccak256(
      encodePacked(
        ["address", "uint256", "uint256", "string", "address", "uint256"],
        [
          props.user,
          props.gameId,
          props.amount,
          "CLAIM",
          contractAddress,
          nonce,
        ]
      )
    );

    // Sign the message
    const signature = await walletClient.signMessage({
      account,
      message: { raw: encodedMessage },
    });

    return signature;
  };

  const enterGame = async (props: {
    gameId: bigint;
    signature: `0x${string}`;
  }): Promise<Hash> => {
    // Read entry fee from contract
    const entryFee = await publicClient.readContract({
      address: contractAddress,
      abi: ROBOTICA_ABI,
      functionName: "entryFee",
    });

    // Send transaction
    return walletClient.writeContract({
      address: contractAddress,
      abi: ROBOTICA_ABI,
      functionName: "enterGame",
      args: [props.gameId, props.signature],
      account: account,
      chain: chain,
      value: entryFee,
    });
  };

  const claimPrize = async (props: {
    amount: bigint;
    gameId: bigint;
    signature: `0x${string}`;
  }): Promise<Hash> => {
    // Simulate transaction first
    const { request } = await publicClient.simulateContract({
      address: contractAddress,
      abi: ROBOTICA_ABI,
      functionName: "claimPrize",
      args: [props.gameId, props.amount, props.signature],
      account: account,
    });

    // Send transaction
    return walletClient.writeContract(request);
  };

  const getNonce = async (): Promise<bigint> => {
    const result = await publicClient.readContract({
      address: contractAddress,
      abi: ROBOTICA_ABI,
      functionName: "getNonce",
      args: [account.address],
    });

    return result;
  };

  const getEntryFee = async (): Promise<bigint> => {
    return publicClient.readContract({
      address: contractAddress,
      abi: ROBOTICA_ABI,
      functionName: "entryFee",
    });
  };

  const getSignerAddress = async (): Promise<Address> => {
    return publicClient.readContract({
      address: contractAddress,
      abi: ROBOTICA_ABI,
      functionName: "signerAddress",
    });
  };

  return {
    enterGame,
    claimPrize,
    generateEnterGameSignature,
    generateClaimPrizeSignature,
    getNonce,
    getEntryFee,
    getSignerAddress,
  };
};
