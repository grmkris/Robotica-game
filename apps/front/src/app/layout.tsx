import { Providers } from "@/components/providers";
import { serverEnvs } from "@/env/serverEnvs";
import "@/styles/globals.css";
import "@/styles/layout.css";
import {
  Inter,
  JetBrains_Mono,
  Orbitron,
  Rajdhani,
  Play,
} from "next/font/google";
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import "stop-runaway-react-effects/hijack";

import type { Metadata } from "next";
import { headers } from "next/headers";

export const metadata: Metadata = {
  title: "Robotica",
  description:
    "Create your own robot and battle with other robots in a fun and creative way",
  icons: {
    icon: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-192x192.png" }],
  },
};

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jb = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
});

const rajdhani = Rajdhani({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-rajdhani",
});

const play = Play({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-play",
});

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const cookies = (await headers()).get("cookie");

  return (
    <html
      lang="en"
      dir="ltr"
      suppressHydrationWarning
      className={`${orbitron.variable} ${rajdhani.variable} ${play.variable} ${serverEnvs.NODE_ENV === "development" ? "debug-screens" : ""} antialiased`}
    >
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no, maximum-scale=1"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>

      <body>
        <div id="main-content">
          <Providers cookies={cookies}>{children}</Providers>
          <Toaster position="top-center" className="!fixed !z-[9999]" />
        </div>
      </body>
    </html>
  );
}
