import type { WalletClient } from "viem";

import {
  FarcasterNetwork,
  ID_GATEWAY_ADDRESS,
  ID_REGISTRY_ADDRESS,
  KEY_GATEWAY_ADDRESS,
  idGatewayABI,
  idRegistryABI,
  keyGatewayABI,
} from '@farcaster/hub-web';
import { createPublicClient, decodeEventLog, http, zeroAddress } from 'viem';
import { optimism } from 'viem/chains';
import type { Logger } from "cat-logger";

/**
 * Populate the following constants with your own values
 */
const OP_PROVIDER_URL = '<REQUIRED>'; // Alchemy or Infura url
const RECOVERY_ADDRESS = zeroAddress; // Optional, using the default value means the account will not be recoverable later if the mnemonic is lost

// Note: hoyt is the Farcaster team's mainnet hub, which is password protected to prevent abuse. Use a 3rd party hub
// provider like https://neynar.com/ Or, run your own mainnet hub and broadcast to it permissionlessly.
const FC_NETWORK = FarcasterNetwork.MAINNET; // Network of the Hub

const CHAIN = optimism;

const IdGateway = {
  abi: idGatewayABI,
  address: ID_GATEWAY_ADDRESS,
  chain: CHAIN,
};
const IdContract = {
  abi: idRegistryABI,
  address: ID_REGISTRY_ADDRESS,
  chain: CHAIN,
};
const KeyContract = {
  abi: keyGatewayABI,
  address: KEY_GATEWAY_ADDRESS,
  chain: CHAIN,
};

export const createFarcasterClient = async (props: {
  walletClient: WalletClient;
  hubUrl?: string;
  hubUsername?: string;
  hubPass?: string;
  useSsl?: boolean;
  logger: Logger;
}) => {
  const publicClient = createPublicClient({
    chain: props.walletClient.chain,
    transport: http()
  });
  const { walletClient } = props;
  const account = walletClient.account;
  if (!account) {
    throw new Error("Account not found");
  }
  const getOrRegisterFid = async (): Promise<number> => {
    const balance = await publicClient.getBalance({ address: account.address });
    // Check if we already have an fid
    const existingFid = (await publicClient.readContract({
      ...IdContract,
      functionName: 'idOf',
      args: [account.address],
    })) as bigint;

    if (existingFid > 0n) {
      return Number.parseInt(existingFid.toString());
    }

    const price = await publicClient.readContract({
      ...IdGateway,
      functionName: 'price',
    });
    if (balance < price) {
      throw new Error(
        `Insufficient balance to rent storage, required: ${price}, balance: ${balance}`
      );
    }
    const registerTxHash = await walletClient.writeContract({
      account,
      ...IdGateway,
      functionName: 'register',
      args: [RECOVERY_ADDRESS],
      value: price,
    });
    const registerTxReceipt = await publicClient.waitForTransactionReceipt({
      hash: registerTxHash,
    });
    // Now extract the FID from the logs
    const registerLog = decodeEventLog({
      abi: idRegistryABI,
      data: registerTxReceipt.logs[0].data,
      topics: registerTxReceipt.logs[0].topics,
    });
    if (!('fid' in registerLog.args)) {
      throw new Error('Fid not found');
    }
    const fid = Number.parseInt(registerLog.args.fid.toString());
    return fid;
  };

  return {
    getOrRegisterFid,
  };
};
