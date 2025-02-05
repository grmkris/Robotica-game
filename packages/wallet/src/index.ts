import { type Logger, createLogger } from "cat-logger";
import type { EvmAddress, Mnemonic, WalletChainId } from "cat-sdk";
import {
  type TransactionRequest,
  createPublicClient,
  createWalletClient,
  erc20Abi,
  erc721Abi,
  http,
} from "viem";
import { mnemonicToAccount } from "viem/accounts";
import {
  arbitrum,
  base,
  baseSepolia,
  mainnet,
  optimism,
  polygon,
  sepolia,
} from "viem/chains";
import { type LifiClient, createLifiClient } from "./lifi/lifi";
import { createSocialClient } from "./social/social";
import {
  type CatWalletUniswapClient,
  createUniswapClient,
} from "./uniswap/uniswap";
export const chains = {
  [8453]: base,
  [84532]: baseSepolia,
  [137]: polygon,
  [11155111]: sepolia,
  [42161]: arbitrum,
  [10]: optimism,
  [1]: mainnet,
};

export const chainIds = {
  base: 8453,
  baseSepolia: 84532,
  polygon: 137,
  sepolia: 11155111,
  arbitrum: 42161,
  optimism: 10,
  mainnet: 1,
};

export const walletClient = createWalletClient({
  chain: mainnet,
  transport: http(),
});

export type CatWalletClient = {
  getAddress: () => EvmAddress;
  transferEth: (props: {
    to: EvmAddress;
    amount: bigint;
    chainId?: WalletChainId;
  }) => Promise<string>;
  erc20: {
    transfer: (props: {
      to: EvmAddress;
      amount: bigint;
      tokenAddress: EvmAddress;
      chainId?: WalletChainId;
    }) => Promise<string>;
    balance: (props: {
      tokenAddress: EvmAddress;
      chainId?: WalletChainId;
    }) => Promise<bigint>;
    approve: (props: {
      spender: EvmAddress;
      amount: bigint;
      tokenAddress: EvmAddress;
      chainId?: WalletChainId;
    }) => Promise<string>;
    allowance: (props: {
      owner: EvmAddress;
      spender: EvmAddress;
      tokenAddress: EvmAddress;
      chainId?: WalletChainId;
    }) => Promise<bigint>;
    deploy: (props: {
      name: string;
      symbol: string;
      decimals: number;
      initialSupply: bigint;
      recipient: EvmAddress;
      chainId?: WalletChainId;
    }) => Promise<string>;
  };
  erc721: {
    transfer: (props: {
      to: EvmAddress;
      tokenId: bigint;
      tokenAddress: EvmAddress;
      chainId?: WalletChainId;
    }) => Promise<string>;
    balance: (props: {
      tokenAddress: EvmAddress;
      chainId?: WalletChainId;
    }) => Promise<bigint>;
    approve: (props: {
      spender: EvmAddress;
      tokenId: bigint;
      tokenAddress: EvmAddress;
      chainId?: WalletChainId;
    }) => Promise<string>;
    isApprovedForAll: (props: {
      owner: EvmAddress;
      spender: EvmAddress;
      tokenAddress: EvmAddress;
      chainId?: WalletChainId;
    }) => Promise<boolean>;
    deploy: (props: {
      name: string;
      symbol: string;
      recipient: EvmAddress;
      chainId?: WalletChainId;
    }) => Promise<string>;
  };
  lifi?: LifiClient;
  social: {
    registerEns: (props: {
      ensName: string;
      chainId?: WalletChainId;
      address?: EvmAddress;
    }) => Promise<string>;
    registerEnsSubdomain: (props: {
      ensName: string;
      subdomain: string;
      chainId?: WalletChainId;
      address?: EvmAddress;
    }) => Promise<string>;
    registerBasename: (props: {
      basename: string;
      chainId?: WalletChainId;
      address?: EvmAddress;
    }) => Promise<string>;
  };
  uniswap: CatWalletUniswapClient;
  signMessage: (props: {
    message: string;
    chainId?: WalletChainId;
  }) => Promise<string>;
  signTransaction: (props: {
    transaction: TransactionRequest;
    chainId?: WalletChainId;
  }) => Promise<string>;
  sendTransaction: (props: {
    transaction: TransactionRequest;
    chainId?: WalletChainId;
  }) => Promise<string>;
};

export const createCatWalletClient = (props: {
  mnemonic: Mnemonic;
  chainId?: WalletChainId;
  logger?: Logger;
  lifiApiKey?: string;
  lifiIntegrator?: string;
}): CatWalletClient => {
  const logger =
    props.logger ??
    createLogger({
      name: "cat-wallet",
    });
  const account = mnemonicToAccount(props.mnemonic);
  const walletClient = createWalletClient({
    account,
    chain: props.chainId ? chains[props.chainId] : mainnet,
    transport: http(),
  });

  const uniswap = createUniswapClient({
    logger,
    walletClient,
  });

  const erc20: CatWalletClient["erc20"] = {
    allowance: (props) => {
      const publicClient = createPublicClient({
        chain: props.chainId ? chains[props.chainId] : mainnet,
        transport: http(),
      });
      return publicClient.readContract({
        address: props.tokenAddress,
        abi: erc20Abi,
        functionName: "allowance",
        args: [props.owner, props.spender],
      });
    },
    balance: (props) => {
      const publicClient = createPublicClient({
        chain: props.chainId ? chains[props.chainId] : mainnet,
        transport: http(),
      });
      return publicClient.readContract({
        address: props.tokenAddress,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [walletClient.account.address],
      });
    },
    transfer: (props) => {
      return walletClient.writeContract({
        address: props.tokenAddress,
        abi: erc20Abi,
        functionName: "transfer",
        args: [props.to, props.amount],
        chain: props.chainId ? chains[props.chainId] : mainnet,
      });
    },
    approve: (props) => {
      return walletClient.writeContract({
        address: props.tokenAddress,
        abi: erc20Abi,
        functionName: "approve",
        args: [props.spender, props.amount],
        chain: props.chainId ? chains[props.chainId] : mainnet,
      });
    },
    deploy: (props) => {
      throw new Error("Not implemented");
    },
  };

  const erc721: CatWalletClient["erc721"] = {
    isApprovedForAll: (props) => {
      const publicClient = createPublicClient({
        chain: props.chainId ? chains[props.chainId] : mainnet,
        transport: http(),
      });
      return publicClient.readContract({
        address: props.tokenAddress,
        abi: erc721Abi,
        functionName: "isApprovedForAll",
        args: [props.owner, props.spender],
      });
    },
    balance: (props) => {
      const publicClient = createPublicClient({
        chain: props.chainId ? chains[props.chainId] : mainnet,
        transport: http(),
      });
      return publicClient.readContract({
        address: props.tokenAddress,
        abi: erc721Abi,
        functionName: "balanceOf",
        args: [walletClient.account.address],
      });
    },
    transfer: (props) => {
      return walletClient.writeContract({
        address: props.tokenAddress,
        abi: erc721Abi,
        functionName: "transferFrom",
        args: [walletClient.account.address, props.to, props.tokenId],
        chain: props.chainId ? chains[props.chainId] : mainnet,
      });
    },
    approve: (props) => {
      return walletClient.writeContract({
        address: props.tokenAddress,
        abi: erc721Abi,
        functionName: "approve",
        args: [props.spender, props.tokenId],
        chain: props.chainId ? chains[props.chainId] : mainnet,
      });
    },
    deploy: (props) => {
      throw new Error("Not implemented");
    },
  };

  const lifi =
    props.lifiApiKey && props.lifiIntegrator
      ? createLifiClient({
          walletClient,
          logger,
          apiKey: props.lifiApiKey,
          integrator: props.lifiIntegrator,
        })
      : undefined;

  return {
    getAddress: () => walletClient.account.address,
    transferEth: (props) =>
      walletClient.sendTransaction({
        to: props.to,
        amount: props.amount,
        chain: props.chainId ? chains[props.chainId] : mainnet,
      }),
    erc20,
    erc721,
    lifi,
    social: createSocialClient({
      walletClient,
      chain: props.chainId ? chains[props.chainId] : undefined,
      logger,
    }),
    uniswap,
    signMessage: (props) => {
      return walletClient.signMessage({
        message: props.message,
      });
    },
    signTransaction: (props) => {
      return walletClient.signTransaction({
        data: props.transaction.data,
        chain: props.chainId ? chains[props.chainId] : mainnet,
      });
    },
    sendTransaction: (props) => {
      return walletClient.sendTransaction({
        data: props.transaction.data,
        chain: props.chainId ? chains[props.chainId] : mainnet,
      });
    },
  };
};
