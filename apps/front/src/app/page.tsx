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
            Connect your wallet to enter the arena and create your battle robot
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
                <h3 className="mb-4 text-2xl text-cyan-400">Robot Creation</h3>
                <ul className="list-inside list-disc text-gray-300">
                  <li>
                    Players can create their robot using a prompt. The more
                    specific you are, the closer the robot will be to your
                    vision. Less specificity introduces more randomness.
                  </li>
                  <li>
                    Be specific about materials, weapons, and tactics.
                    Everything is taken into consideration during battles!
                  </li>
                  <li>You can create multiple robots on your account.</li>
                </ul>
              </div>

              {/* AVAX Information Section */}
              <div className="cyberpunk-card rounded-lg border border-cyan-400/30 bg-black/50 p-6 backdrop-blur-sm">
                <h3 className="mb-4 text-2xl text-cyan-400">
                  AVAX Requirements
                </h3>
                <ul className="list-inside list-disc text-gray-300">
                  <li>
                    Players must connect their wallet of choice on the AVAX
                    blockchain.
                  </li>
                  <li>
                    To create or join a room, players need at least 0.001 AVAX
                    in their wallet.
                  </li>
                  <li>The winner of the battle can claim the prize.</li>
                </ul>
                <p className="text-gray-300">
                  Ensure you have at least 0.001 AVAX in your wallet to
                  participate in battles. This is essential for creating or
                  joining battle rooms. Connect your wallet and get ready to
                  fight!
                </p>
              </div>
            </div>

            {/* Add padding to separate sections */}
            <div className="mt-12" />

            {/* Battle Mechanics */}
            <div className="cyberpunk-card rounded-lg border border-cyan-400/30 bg-black/50 p-6 backdrop-blur-sm">
              <h3 className="mb-4 text-2xl text-cyan-400">Battle Mechanics</h3>
              <ul className="list-inside list-disc text-gray-300">
                <li>
                  Battles are overseen by our Smart Judge LLM, who also provides
                  commentary on the rounds.
                </li>
                <li>
                  The battle follows the principles of boxing or any other
                  round-based sport, with a maximum of 10 rounds. A winner is
                  decided if there is no knockout or finish before that.
                </li>
                <li>
                  Everything that happens in previous rounds affects the
                  following rounds, such as damage to your robot.
                </li>
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
              <div className="absolute left-1/2 h-full w-1 -translate-x-1/2 transform bg-gradient-to-b from-purple-400 to-cyan-400"></div>

              {/* Roadmap items */}
              <div className="space-y-24">
                <div className="relative flex items-center justify-center">
                  <div className="w-1/2 pr-8">
                    <div className="cyberpunk-card rounded-lg border border-purple-400/30 bg-black/50 p-6 backdrop-blur-sm">
                      <h3 className="mb-2 text-2xl text-purple-400">Phase 1</h3>
                      <ul className="list-inside list-disc text-gray-300">
                        <li>Launch of v0 with Smart Judge.</li>
                        <li>Robot Agents fight for rewards or free.</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="relative flex items-center justify-center">
                  <div className="w-1/2 pl-8">
                    <div className="cyberpunk-card rounded-lg border border-cyan-400/30 bg-black/50 p-6 backdrop-blur-sm">
                      <h3 className="mb-2 text-2xl text-cyan-400">Phase 2</h3>
                      <ul className="list-inside list-disc text-gray-300">
                        <li>Implement robot persistence using NFTs.</li>
                        <li>
                          Players earn NFTs that grant knowledge to their agents
                          until defeated.
                        </li>
                      </ul>
                    </div>
                  </div>
                  <div className="absolute -top-4 left-1/2 z-0 h-4 w-4 -translate-x-1/2 transform rounded-full bg-cyan-400"></div>
                </div>

                <div className="relative flex items-center justify-center">
                  <div className="w-1/2 pr-8">
                    <div className="cyberpunk-card rounded-lg border border-purple-400/30 bg-black/50 p-6 backdrop-blur-sm">
                      <h3 className="mb-2 text-2xl text-purple-400">Phase 3</h3>
                      <ul className="list-inside list-disc text-gray-300">
                        <li>Introduce multiple fighting arenas.</li>
                        <li>
                          Arenas will have unique traits (e.g., no gravity,
                          lava, water).
                        </li>
                      </ul>
                    </div>
                  </div>
                  <div className="absolute -top-4 left-1/2 z-0 h-4 w-4 -translate-x-1/2 transform rounded-full bg-purple-400"></div>
                </div>

                <div className="relative flex items-center justify-center">
                  <div className="w-1/2 pl-8">
                    <div className="cyberpunk-card rounded-lg border border-cyan-400/30 bg-black/50 p-6 backdrop-blur-sm">
                      <h3 className="mb-2 text-2xl text-cyan-400">Phase 4</h3>
                      <ul className="list-inside list-disc text-gray-300">
                        <li>Launch a token with staking options.</li>
                        <li>
                          Host tournaments and introduce additional features.
                        </li>
                      </ul>
                    </div>
                  </div>
                  <div className="absolute -top-4 left-1/2 z-0 h-4 w-4 -translate-x-1/2 transform rounded-full bg-cyan-400"></div>
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
