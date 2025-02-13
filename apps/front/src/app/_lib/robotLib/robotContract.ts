import { createRoboticaOnchain } from "robot-onchain";
import { createPublicClient, http, type WalletClient } from "viem";
import { avalanche } from "viem/chains";

// Contract address from environment variable
const CONTRACT_ADDRESS = "0xf6f1288521d772e881ecc2b8cc2c147a33f6a30c";

// Create public client for transaction watching
const publicClient = createPublicClient({
  chain: avalanche,
  transport: http(),
});

// Ensure signature is hex string
const ensureHexSignature = (signature: string): `0x${string}` => {
  if (!signature.startsWith("0x")) {
    return `0x${signature}` as `0x${string}`;
  }
  return signature as `0x${string}`;
};

// Contract interactions using user's wallet
export const enterGame = async (props: {
  gameId: bigint;
  signature: string;
  walletClient: WalletClient;
}) => {
  const { gameId, signature, walletClient } = props;
  const contract = createRoboticaOnchain({
    walletClient,
    contractAddress: CONTRACT_ADDRESS,
    chain: avalanche,
  });

  const hash = await contract.enterGame({
    gameId: gameId,
    signature: ensureHexSignature(signature),
  });

  // Wait for transaction confirmation
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return receipt;
};

export const claimPrize = async ({
  gameId,
  amount,
  signature,
  walletClient,
}: {
  gameId: bigint;
  amount: bigint;
  signature: string;
  walletClient: WalletClient;
}) => {
  const robotica = createRoboticaOnchain({
    walletClient,
    contractAddress: CONTRACT_ADDRESS,
    chain: avalanche,
  });

  const hash = await robotica.claimPrize({
    gameId,
    amount,
    signature: ensureHexSignature(signature),
  });

  // Wait for transaction confirmation
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return receipt;
};
