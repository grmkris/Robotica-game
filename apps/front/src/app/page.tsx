"use client";

import { CreateRobot } from "./_lib/robotLib/components/CreateRobot";
import { ConnectWallet } from "@/components/ConnectWallet";
import { useAuth } from "./auth/useAuth";

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();

  console.log("Auth state:", { isAuthenticated, isLoading });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <h1 className="mb-8 text-3xl font-bold">
          Welcome to Robot Battle Arena
        </h1>
        <ConnectWallet />
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-24">
      <h1 className="mb-8 text-3xl font-bold">Robot Battle Arena</h1>
      <CreateRobot />
    </main>
  );
}
