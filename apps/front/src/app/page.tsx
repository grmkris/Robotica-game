"use client";

import { Button } from "@/components/ui/button";
import { ConnectWallet } from "@/components/ConnectWallet";
import { useAuth } from "./auth/useAuth";
import { Header } from "@/components/Header";
import { useRouter } from "next/navigation";
export default function LandingPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const handleEnterArena = () => {
    router.push("/dashboard");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <div className="text-xl text-cyan-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header onEnterArena={handleEnterArena} />
      <div className="flex flex-1 flex-col items-center justify-center">
        <h1 className="mb-8 text-4xl font-bold tracking-wider text-cyan-400 md:text-6xl">
          Robot Battle Arena
        </h1>
        <p className="mb-12 max-w-2xl text-xl leading-relaxed text-cyan-100 md:text-2xl">
          Connect your wallet to enter the arena and create your battle robot
        </p>
        {!isAuthenticated ? (
          <ConnectWallet />
        ) : (
          <Button
            onClick={handleEnterArena}
            className="transform rounded-lg bg-cyan-500 px-8 py-3 text-lg font-bold text-black shadow-lg shadow-cyan-500/50 transition-all duration-200 hover:scale-105 hover:bg-cyan-600"
          >
            Enter Arena
          </Button>
        )}
      </div>
    </div>
  );
}
