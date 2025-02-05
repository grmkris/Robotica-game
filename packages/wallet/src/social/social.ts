import { type EnsPublicClient, addEnsContracts, createEnsPublicClient, createEnsWalletClient } from '@ensdomains/ensjs';
import type { Logger } from 'cat-logger';
import type { EvmAddress } from 'cat-sdk';
import { type Chain, type WalletClient, createPublicClient, http } from "viem";
import type { CatWalletClient } from "..";
import { BaseNameABI } from './abi/BaseNameABI';


interface ENSRegistrationParams {
  name: string;
  ownerAddress: EvmAddress;
  duration: number; // in seconds
  chain?: Chain;
}

interface SubdomainRegistrationParams {
  parentDomain: string;
  label: string; // subdomain part
  chain?: Chain;
  ownerAddress: EvmAddress;
}

// Add new interface for basename registration
interface BasenameRegistrationParams {
  basename: string;
  address: EvmAddress;
}

// Helper function to check name availability
export async function checkENSNameAvailability(name: string, ensPublicClient: EnsPublicClient): Promise<boolean> {
  try {
    const available = await ensPublicClient.getAvailable({ name });
    return available;
  } catch (error) {
    console.error('Error checking ENS name availability:', error);
    throw error;
  }
}

export const createSocialClient = (props: {
  walletClient: WalletClient;
  chain?: Chain;
  logger: Logger;
}): CatWalletClient['social'] => {
  const { walletClient, chain } = props;

  async function _registerENSName({
    name,
    ownerAddress,
    duration,
    chain,
  }: ENSRegistrationParams): Promise<string> {
    const ensChain = chain ?? props.chain;
    if (!ensChain) throw new Error('No chain provided');

    // Create clients using the custom transport
    const ensPublicClient = createEnsPublicClient({
      chain: addEnsContracts(ensChain),
      transport: http(),
    });

    const ensWalletClient = createEnsWalletClient({
      chain: addEnsContracts(ensChain),
      transport: http(),
      account: walletClient.account
    });

    const publicClient = createPublicClient({
      chain: ensChain,
      transport: http(),
    });

    try {
      const account = walletClient.account;
      if (!account) {
        throw new Error('Account not found');
      }

      // Check name availability
      const available = await ensPublicClient.getAvailable({ name });

      props.logger.info({
        msg: 'ENS name availability',
        available,
      });

      if (!available) {
        throw new Error(`ENS name ${name} is not available`);
      }

      // Get registration price
      const price = await ensPublicClient.getPrice({
        nameOrNames: [name],
        duration
      });

      props.logger.info({
        msg: 'ENS name price',
        price,
      });

      // Generate commitment
      const secret = `0x${Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')}` as `0x${string}`;

      // Step 1: Make commitment
      const commitmentTx = await ensWalletClient.commitName({
        name,
        owner: ownerAddress,
        duration,
        secret,
      });

      props.logger.info({
        msg: 'Commitment transaction sent',
        commitmentTx,
      });

      // Wait for commitment transaction to be mined
      await publicClient.waitForTransactionReceipt({
        hash: commitmentTx
      });

      // Wait for minimum commit period (60 seconds)
      await new Promise(resolve => setTimeout(resolve, 60000));

      // Step 2: Register name
      const registerTx = await ensWalletClient.registerName({
        name,
        owner: ownerAddress,
        duration,
        secret,
        value: price.base,
      });

      props.logger.info({
        msg: 'Registration transaction sent',
        registerTx,
      });

      // Wait for registration transaction to be mined
      await publicClient.waitForTransactionReceipt({
        hash: registerTx
      });

      return registerTx;
    } catch (error) {
      console.error('Error registering ENS name:', error);
      throw error;
    }
  }

  async function _registerSubdomain({
    parentDomain,
    label,
    ownerAddress,
    chain,
  }: SubdomainRegistrationParams): Promise<string> {
    const ensChain = chain ?? props.chain;
    if (!ensChain) throw new Error('No chain provided');

    // Create clients using the custom transport
    const ensPublicClient = createEnsPublicClient({
      chain: addEnsContracts(ensChain),
      transport: http(),
    });

    const ensWalletClient = createEnsWalletClient({
      chain: addEnsContracts(ensChain),
      transport: http(),
      account: walletClient.account
    });

    const publicClient = createPublicClient({
      chain: ensChain,
      transport: http(),
    });

    try {

      // Check if parent domain exists and is owned by the signer
      const owner = await ensPublicClient.getOwner({
        name: parentDomain,
      });

      if (!owner) {
        throw new Error(`Parent domain ${parentDomain} does not exist`);
      }
      const account = ensWalletClient.account;
      if (!account) {
        throw new Error('Account not found');
      }

      // Create subdomain with correct parameters
      const transaction = await ensWalletClient.createSubname({
        name: `${label}.${parentDomain}`,
        owner: ownerAddress,
        contract: 'nameWrapper',
        // @ts-expect-error TODO: fix this
        account,
      });

      props.logger.info({
        msg: 'Subdomain registration transaction sent',
        transaction,
      });

      // Wait for transaction to be mined
      await publicClient.waitForTransactionReceipt({
        hash: transaction
      });

      return transaction;
    } catch (error) {
      console.error('Error registering subdomain:', error);
      throw error;
    }
  }

  async function _registerBasename({
    basename,
    address,
  }: BasenameRegistrationParams): Promise<string> {
    try {
      const account = walletClient.account;
      if (!account) {
        throw new Error('Account not found');
      }

      const addresses = {
        base: {
          BaseNamesRegistrarControllerAddress: "0x4cCb0BB02FCABA27e82a56646E81d8c5bC4119a5",
          // Base Mainnet Registrar Controller Contract Address.
          L2ResolverAddress: "0xC6d566A56A1aFf6508b41f6c90ff131615583BCD",
        },
        baseSepolia: {
          BaseNamesRegistrarControllerAddress: "0x49aE3cC2e3AA768B1e5654f5D3C6002144A59581",
          L2ResolverAddress: "0x6533C94869D28fAA8dF77cc63f9e2b2D6Cf77eBA",
        }
      } as const;

      const baseRegistrarAddress = (() => {
        switch (chain?.id) {
          case 8453: return addresses.base.BaseNamesRegistrarControllerAddress;
          case 84532: return addresses.baseSepolia.BaseNamesRegistrarControllerAddress;
          default: throw new Error(`Unsupported chain ${chain?.id}`);
        }
      })();

      // According to Coinbase docs, basename registration is done through a smart contract
      // This is a simplified example - you'll need to add the actual contract interaction
      const transaction = await walletClient.writeContract({
        account: account,
        address: baseRegistrarAddress,
        chain: chain,
        abi: BaseNameABI,
        functionName: 'register',
        // 0.0001 ether
        value: BigInt(100000000000000),
        args: [
          {
            name: basename,
            owner: address,
            duration: BigInt(31536000), // 1 year in seconds
            resolver: addresses.baseSepolia.L2ResolverAddress,
            data: [],
            reverseRecord: false,
          }
        ],
      });

      props.logger.info({
        msg: 'Basename registration transaction sent',
        transaction,
      });

      const publicClient = createPublicClient({
        chain: chain,
        transport: http(),
      });

      // Wait for transaction to be mined
      await publicClient.waitForTransactionReceipt({
        hash: transaction
      });

      return transaction;
    } catch (error) {
      console.error('Error registering basename:', error);
      throw error;
    }
  }

  return {
    registerEns: async (props) => {
      const owner = props.address || (await walletClient.account?.address);
      if (!owner) throw new Error('No owner address provided');
      const register = await _registerENSName({
        name: props.ensName,
        ownerAddress: owner,
        duration: 31536000, // 1 year in seconds
      });
      return register;
    },
    registerEnsSubdomain: async (props) => {
      const owner = props.address || (await walletClient.account?.address);
      if (!owner) throw new Error('No owner address provided');
      return _registerSubdomain({
        parentDomain: props.ensName,
        label: props.subdomain,
        ownerAddress: owner,
      });
    },
    registerBasename: async (props) => {
      const owner = props.address || (await walletClient.account?.address);
      if (!owner) throw new Error('No owner address provided');
      return _registerBasename({
        basename: props.basename,
        address: owner,
      });
    },
  };
};
