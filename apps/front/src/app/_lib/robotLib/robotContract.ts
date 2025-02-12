import { createRoboticaOnchain } from "robot-onchain";
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type WalletClient,
} from "viem";
import { avalanche } from "viem/chains";

// Contract address from environment variable
const CONTRACT_ADDRESS = process.env
  .NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;

// Create public client for transaction watching
const publicClient = createPublicClient({
  chain: avalanche,
  transport: http(),
});

// Get user's wallet client
export const getWalletClient = async (): Promise<WalletClient> => {
  if (!window.ethereum) throw new Error("No ethereum provider found");

  return createWalletClient({
    chain: avalanche,
    transport: custom(window.ethereum as any),
  });
};

// Ensure signature is hex string
const ensureHexSignature = (signature: string): `0x${string}` => {
  if (!signature.startsWith("0x")) {
    return `0x${signature}` as `0x${string}`;
  }
  return signature as `0x${string}`;
};

// Helper function to convert BattleId to numeric string
const getBattleNumericId = (battleId: string) => battleId.replace("bat", "");

// Contract interactions using user's wallet
export const enterGame = async (gameId: string, signature: string) => {
  const walletClient = await getWalletClient();
  const contract = createRoboticaOnchain({
    walletClient,
    contractAddress: CONTRACT_ADDRESS,
    chain: avalanche,
  });

  const numericGameId = getBattleNumericId(gameId);
  const hash = await contract.enterGame({
    gameId: BigInt(numericGameId),
    signature: ensureHexSignature(signature),
  });

  // Wait for transaction confirmation
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return receipt;
};

export const claimPrize = async (
  gameId: string,
  amount: string,
  signature: string,
) => {
  const walletClient = await getWalletClient();
  const contract = createRoboticaOnchain({
    walletClient,
    contractAddress: CONTRACT_ADDRESS,
    chain: avalanche,
  });

  const numericGameId = getBattleNumericId(gameId);
  const hash = await contract.claimPrize({
    gameId: BigInt(numericGameId),
    amount: BigInt(amount),
    signature: ensureHexSignature(signature),
  });

  // Wait for transaction confirmation
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return receipt;
};
