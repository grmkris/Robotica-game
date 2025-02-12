// config/index.tsx

import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { avalanche } from "@reown/appkit/networks";
import { cookieStorage, createStorage } from "wagmi";

// Get projectId from environment variable
export const REOWN_PROJECT_ID = "8383ac42481166d54510aff79361fd61";

if (!REOWN_PROJECT_ID) {
  throw new Error("Project ID is not defined");
}

export const networks = [avalanche];

// Set up the Wagmi Adapter (Config)
export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
  projectId: REOWN_PROJECT_ID,
  networks,
});

export const config = wagmiAdapter.wagmiConfig;
