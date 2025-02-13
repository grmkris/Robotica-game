"use client";

import { ConnectWallet } from "@/components/ConnectWallet";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { IsometricLoader } from "./_lib/robotLib/components/IsometricLoader";
import { useAuth } from "./auth/useAuth";

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
      {/* Make Header sticky */}
      <div className="fixed top-0 z-50 w-full backdrop-blur-sm">
        <Header onEnterArena={handleEnterArena} />
      </div>

      {/* Add padding to account for fixed header */}
      <div className="pt-16">
        {/* Hero Section */}
        <div className="relative flex min-h-screen flex-col items-center justify-center">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent to-black/50" />
          <h1 className="cyberpunk-title mb-8 text-5xl font-bold md:text-7xl">
            ROBOTICA
          </h1>
          <p className="cyberpunk-text mb-12 max-w-2xl text-center text-xl leading-relaxed md:text-2xl">
            Dream of your own robot agent and enter the arena, powered by cutting-edge entertainment AI agents.
          </p>
          {!isAuthenticated ? (
            <ConnectWallet />
          ) : (
            <Button onClick={handleEnterArena} className="cyberpunk-button">
              Enter Arena
            </Button>
          )}
          <div className="absolute bottom-10 animate-bounce">
            <p className="text-sm text-cyan-400">Scroll to learn more</p>
            <div className="mx-auto mt-2 h-10 w-6 rounded-full border-2 border-cyan-400">
              <div className="mx-auto mt-2 h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
            </div>
          </div>
        </div>

        {/* Game Rules Section */}
        <div className="min-h-screen bg-gradient-to-b from-black via-blue-900/20 to-black p-8">
          <div className="mx-auto max-w-6xl">
            <h2 className="cyberpunk-title mb-12 text-center text-4xl">
              <span className="text-cyan-400">&lt;</span> BATTLE RULES{" "}
              <span className="text-cyan-400">/&gt;</span>
            </h2>
            <div className="grid gap-8 md:grid-cols-2">
              {/* Robot Creation */}
              <div className="cyberpunk-card rounded-lg border border-cyan-400/30 bg-black/50 p-6 backdrop-blur-sm">
                <h3 className="mb-4 text-2xl text-cyan-400">Agent Creation</h3>
                <ul className="list-inside list-disc text-gray-300">
                  <li>Create your robot agent</li>
                  <li>Specify materials, weapons, and tactics</li>
                  <li>Build multiple robot agents per account</li>
                </ul>
              </div>

              {/* AVAX Information Section */}
              <div className="cyberpunk-card rounded-lg border border-cyan-400/30 bg-black/50 p-6 backdrop-blur-sm">
                <h3 className="mb-4 text-2xl text-cyan-400">AVAX Requirements</h3>
                <ul className="list-inside list-disc text-gray-300">
                  <li>Connect wallet on AVAX network</li>
                  <li>Minimum 0.001 AVAX to play</li>
                  <li>Winners claim battle prizes</li>
                </ul>
              </div>
            </div>

            {/* Add padding to separate sections */}
            <div className="mt-12" />

            {/* Battle Mechanics */}
            <div className="cyberpunk-card rounded-lg border border-cyan-400/30 bg-black/50 p-6 backdrop-blur-sm">
              <h3 className="mb-4 text-2xl text-cyan-400">Battle Mechanics</h3>
              <ul className="list-inside list-disc text-gray-300">
                <li>Smart Agent Judge oversees battles</li>
                <li>10-round maximum fights</li>
                <li>Damage persists between rounds</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Roadmap Section */}
        <div className="min-h-screen bg-gradient-to-b from-black via-purple-900/20 to-black p-8">
          <div className="mx-auto max-w-6xl">
            <h2 className="cyberpunk-title mb-12 text-center text-4xl">
              <span className="text-purple-400">&lt;</span> ROADMAP{" "}
              <span className="text-purple-400">/&gt;</span>
            </h2>
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-1/2 h-full w-1 -translate-x-1/2 transform bg-gradient-to-b from-purple-400 to-cyan-400" />

              {/* Roadmap items */}
              <div className="space-y-24">
                <div className="relative flex items-center justify-center">
                  <div className="w-1/2 pr-8">
                    <div className="cyberpunk-card rounded-lg border border-purple-400/30 bg-black/50 p-6 backdrop-blur-sm">
                      <h3 className="mb-2 text-2xl text-purple-400">Phase 1</h3>
                      <ul className="list-inside list-disc text-gray-300">
                        <li>Launch v0 with Smart Agent Judge</li>
                        <li>Battle for rewards or practice</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="relative flex items-center justify-center">
                  <div className="w-1/2 pl-8">
                    <div className="cyberpunk-card rounded-lg border border-cyan-400/30 bg-black/50 p-6 backdrop-blur-sm">
                      <h3 className="mb-2 text-2xl text-cyan-400">Phase 2</h3>
                      <ul className="list-inside list-disc text-gray-300">
                        <li>Robot Agent becomes an NFT</li>
                        <li>Battle-tested robot agents gain knowledge</li>
                      </ul>
                    </div>
                  </div>
                  <div className="absolute -top-4 left-1/2 z-0 h-4 w-4 -translate-x-1/2 transform rounded-full bg-cyan-400" />
                </div>

                <div className="relative flex items-center justify-center">
                  <div className="w-1/2 pr-8">
                    <div className="cyberpunk-card rounded-lg border border-purple-400/30 bg-black/50 p-6 backdrop-blur-sm">
                      <h3 className="mb-2 text-2xl text-purple-400">Phase 3</h3>
                      <ul className="list-inside list-disc text-gray-300">
                        <li>Multiple arena environments</li>
                        <li>Unique arena effects (gravity, lava, water)</li>
                      </ul>
                    </div>
                  </div>
                  <div className="absolute -top-4 left-1/2 z-0 h-4 w-4 -translate-x-1/2 transform rounded-full bg-purple-400" />
                </div>

                <div className="relative flex items-center justify-center">
                  <div className="w-1/2 pl-8">
                    <div className="cyberpunk-card rounded-lg border border-cyan-400/30 bg-black/50 p-6 backdrop-blur-sm">
                      <h3 className="mb-2 text-2xl text-cyan-400">Phase 4</h3>
                      <ul className="list-inside list-disc text-gray-300">
                        <li>Cross-chain expansion</li>
                        <li>Global AI entertainment tournaments</li>
                        <li>Token launch to support the ecosystem</li>
                        <li>Cross-chain battle leagues</li>
                      </ul>
                    </div>
                  </div>
                  <div className="absolute -top-4 left-1/2 z-0 h-4 w-4 -translate-x-1/2 transform rounded-full bg-cyan-400" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer with cyberpunk style */}
        <footer className="border-t border-cyan-400/30 bg-black/90 p-8">
          <div className="mx-auto max-w-6xl text-center">
            <p className="mb-2 text-cyan-400">ROBOTICA</p>
            <p className="text-sm text-gray-400">© 2024 All rights reserved</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
