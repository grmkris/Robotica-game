import type { RobotClient } from "@/app/_lib/robotLib/robotClient";
import { robotClient } from "@/app/_lib/robotLib/robotClient";
import type {
  SIWECreateMessageArgs,
  SIWESession,
  SIWEVerifyMessageArgs,
} from "@reown/appkit-siwe";
import { createSIWEConfig, formatMessage } from "@reown/appkit-siwe";
import { avalanche } from "@reown/appkit/networks";

export type RobotSiweAuth = {
  getCsrfToken: () => Promise<string>;
  signIn: (props: {
    message: string;
    signature: string;
    callbackUrl: string;
    redirect: boolean;
  }) => Promise<{ ok: boolean }>;
  signOut: (props: { redirect: boolean }) => Promise<boolean>;
  getSession: () => Promise<SIWESession | null>;
  verifyMessage: (args: SIWEVerifyMessageArgs) => Promise<boolean>;
};

type NonceResponse = { nonce: string };
type VerifyResponse = { ok: boolean };
type UserResponse = {
  wallets: Array<{
    address: string;
    chainId: number;
  }>;
};

export const createRobotSiweAuth = (props: {
  apiClient: RobotClient;
}): RobotSiweAuth => {
  console.log(props.apiClient);
  return {
    getCsrfToken: async () => {
      const response = await props.apiClient.auth.siwe.nonce.$get();
      const data = (await response.json()) as NonceResponse;
      return data.nonce;
    },

    signIn: async ({ message, signature, callbackUrl, redirect }) => {
      const response = await props.apiClient.auth.siwe.verify.$post({
        json: { message, signature },
      });
      const data = (await response.json()) as VerifyResponse;
      if (!data.ok) return { ok: false };
      if (redirect) {
        window.location.href = callbackUrl;
      }
      return { ok: true };
    },

    signOut: async ({ redirect }) => {
      await props.apiClient.auth.logout.$get({
        query: { redirect },
      });
      return true;
    },

    getSession: async () => {
      const response = await props.apiClient.auth.me.$get();
      if (!response.ok) return null;
      const data = await response.json();
      const wallet = data.wallets[0];
      if (!wallet) return null;
      const session: SIWESession = {
        address: wallet.address,
        chainId: avalanche.id,
      };
      console.log("session", session);
      return session;
    },

    verifyMessage: async ({ message, signature }) => {
      const response = await props.apiClient.auth.siwe.verify.$post({
        json: { message, signature },
      });
      const data = (await response.json()) as VerifyResponse;
      return data.ok;
    },
  };
};

const auth = createRobotSiweAuth({
  apiClient: robotClient,
});

export const siweConfig = createSIWEConfig({
  getMessageParams: async () => {
    return {
      domain: typeof window !== "undefined" ? window.location.host : "",
      uri: typeof window !== "undefined" ? window.location.origin : "",
      chains: [avalanche.id],
      statement: "Sign in with Ethereum to Robotica",
    };
  },
  createMessage: ({ address, ...args }: SIWECreateMessageArgs) =>
    formatMessage(args, address),
  getNonce: auth.getCsrfToken,
  getSession: auth.getSession,
  verifyMessage: auth.verifyMessage,
  signOut: async () => {
    return await auth.signOut({ redirect: true });
  },
  nonceRefetchIntervalMs: 1000 * 60 * 5, // 5 minutes
  onSignIn: async () => {
    console.log("onSignIn");
  },
  onSignOut: async () => {
    console.log("onSignOut");
  },
  sessionRefetchIntervalMs: 1000 * 60 * 5, // 5 minutes
  signOutOnAccountChange: false,
  signOutOnDisconnect: false,
  signOutOnNetworkChange: false,
});
