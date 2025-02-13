"use client";
import { Toaster } from "@/components/ui/sonner";
import { siweConfig } from "@/siweConfig";
import { REOWN_PROJECT_ID, wagmiAdapter } from "@/wagmiConfig";
import { createAppKit } from "@reown/appkit";
import { avalanche } from "@reown/appkit/networks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { type Config, WagmiProvider, cookieToInitialState } from "wagmi";

const queryClient = new QueryClient();

// Set up metadata
const metadata = {
  name: "Robotica.gg",
  description: "Robotica.gg is a platform for creating and battling robots",
  url: "https://robotica.gg", // origin must match your domain & subdomain
  icons: ["https://assets.reown.com/reown-profile-pic.png"], // TODO: replace with catmisha logo
};

// Create the modal
const modal = createAppKit({
  adapters: [wagmiAdapter],
  projectId: REOWN_PROJECT_ID,
  networks: [avalanche],
  defaultNetwork: avalanche,
  metadata: metadata,
  features: {
    email: true,
    socials: [
      "google",
      "x",
      "github",
      "discord",
      "apple",
      "facebook",
      "farcaster",
    ],
    emailShowWallets: true,
    analytics: true,
  },
  allWallets: "SHOW",
  siweConfig: siweConfig,
  themeVariables: {
    "--w3m-font-family": "var(--font-play)",
    "--w3m-accent": "#1a9999",
    "--w3m-color-mix": "#008080",
    "--w3m-color-mix-strength": 20,
    "--w3m-border-radius-master": "6px",
    "--w3m-font-size-master": "14px",
    "--w3m-z-index": 1000,
    "--w3m-qr-color": "#008080",
  },
});

export function Providers({
  children,
  cookies,
}: {
  children: ReactNode;
  cookies: string | null;
}) {
  const initialState = cookieToInitialState(
    wagmiAdapter.wagmiConfig as Config,
    cookies,
  );

  return (
    <WagmiProvider
      config={wagmiAdapter.wagmiConfig as Config}
      initialState={initialState}
    >
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class">
          {children}
          <ReactQueryDevtools buttonPosition="bottom-left" />
          <Toaster richColors />
        </ThemeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
