"use client";

import { Button } from "@/components/ui/button";
import { ConnectWallet } from "@/components/ConnectWallet";
import { useAuth } from "./auth/useAuth";
import { Header } from "@/components/Header";
import { useRouter } from "next/navigation";
import { IsometricLoader } from "./_lib/robotLib/components/IsometricLoader";

export default function LandingPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const handleEnterArena = () => {
    router.push("/dashboard");
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <IsometricLoader />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header onEnterArena={handleEnterArena} />
      <div className="flex flex-1 flex-col items-center justify-center">
        <h1 className="cyberpunk-title mb-8 text-5xl font-bold md:text-7xl">
          ROBOTICA
        </h1>
        <p className="cyberpunk-text mb-12 max-w-2xl text-center text-xl leading-relaxed md:text-2xl">
          Connect your wallet to enter the arena and create your battle robot
        </p>
        {!isAuthenticated ? (
          <ConnectWallet />
        ) : (
          <Button onClick={handleEnterArena} className="cyberpunk-button">
            Enter Arena
          </Button>
        )}
      </div>
    </div>
  );
}
