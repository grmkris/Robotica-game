"use client";

import { CreateRobot } from "./_lib/robotLib/components/CreateRobot";
import { ConnectWallet } from "@/components/ConnectWallet";
import { useAuth } from "./auth/useAuth";
import { Header } from "@/components/Header";

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();

  console.log("Auth state:", { isAuthenticated, isLoading });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="flex flex-1 flex-col items-center justify-center">
          <h2 className="mb-8 text-2xl font-bold text-cyan-400">
            Connect your wallet to enter the arena
          </h2>
          <ConnectWallet />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-900 text-white">
      <Header />
      <main className="container mx-auto flex-1 p-6">
        <div className="mx-auto max-w-2xl">
          <CreateRobot />
          {/* We can add RobotList and BattleArena components here later */}
        </div>
      </main>
    </div>
  );
}
