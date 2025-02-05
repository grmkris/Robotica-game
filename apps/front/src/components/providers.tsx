"use client";
import { Toaster } from "@/components/ui/sonner";
import { siweConfig } from "@/siweConfig";
import { REOWN_PROJECT_ID, wagmiAdapter } from "@/wagmiConfig";
import { createAppKit } from "@reown/appkit";
import { base, baseSepolia } from "@reown/appkit/networks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { type Config, WagmiProvider, cookieToInitialState } from "wagmi";

const queryClient = new QueryClient();

// Set up metadata
const metadata = {
  name: "Cat Misha",
  description: "Cat Misha is a world first AI cat influencer",
  url: "https://catmisha.com", // origin must match your domain & subdomain
  icons: ["https://assets.reown.com/reown-profile-pic.png"], // TODO: replace with catmisha logo
};

// Create the modal
const modal = createAppKit({
  adapters: [wagmiAdapter],
  projectId: REOWN_PROJECT_ID,
  networks: [base, baseSepolia],
  defaultNetwork: base,
  metadata: metadata,
  features: {
    email: true, // default to true
    socials: [
      "google",
      "x",
      "github",
      "discord",
      "apple",
      "facebook",
      "farcaster",
    ],
    emailShowWallets: true, // default to true
    analytics: true, // Optional - defaults to your Cloud configuration
  },
  allWallets: "SHOW", // default to SHOW
  siweConfig: siweConfig, // pass your siweConfig
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
