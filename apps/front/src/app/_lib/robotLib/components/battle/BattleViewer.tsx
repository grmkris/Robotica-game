import {
  useGetBattleById,
  useGenerateClaimSignature,
  useGetUserRobots,
} from "@/app/_lib/robotLib/robotHooks";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { BattleId, RobotId } from "robot-sdk";
import { IsometricLoader } from "../IsometricLoader";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { Button } from "@/components/ui/button";
import { useAccount } from "wagmi";
import { toast } from "sonner";
import { claimPrize } from "../../robotContract";

interface BattleRound {
  id: `rnd${string}`;
  battleId: BattleId;
  roundNumber: number;
  description: string;
  tacticalAnalysis: string;
  winnerId: RobotId | null;
  imageUrl: string | null;
}

const ENTRY_FEE = BigInt("1000000000000000"); // 0.001 AVAX
const PRIZE_AMOUNT = ENTRY_FEE * 2n; // 0.002 AVAX

export function BattleViewer({ battleId }: { battleId: BattleId }) {
  const { data: battle, isLoading } = useGetBattleById(battleId);
  const { address } = useAccount();
  const generateClaimSignature = useGenerateClaimSignature();
  const { data: userRobots } = useGetUserRobots();

  const handleClaim = async () => {
    if (!battle?.winnerId || !address) return;

    try {
      // Simulate a delay to mimic transaction time
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success("Prize claimed successfully! (Test mode)");
    } catch (error) {
      console.error("Failed to claim prize:", error);
      toast.error("Failed to claim prize");
    }
  };

  const getRobotName = (robotId: RobotId | null) => {
    if (!robotId || !battle?.robots) return null;
    return (
      battle.robots.find((r) => r.id === robotId)?.name ||
      `Robot #${robotId.split("_")[1]}`
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <IsometricLoader />
      </div>
    );
  }

  if (!battle) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <p className="text-zinc-400">Battle not found</p>
      </div>
    );
  }

  const isWaiting = battle.status === "WAITING";
  const isGeneratingRounds = battle.status === "IN_PROGRESS";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-cyan-400">
            {battle.id ? `Battle #${battle.id.split("_")[1]}` : "Loading..."}
          </h2>
          <p className="text-zinc-400">
            Status: {battle.status}
            {battle.winnerId && ` - Winner: ${getRobotName(battle.winnerId)}`}
          </p>
        </div>
        {battle?.status === "COMPLETED" &&
          battle.winnerId &&
          address &&
          userRobots?.robots.some((robot) => robot.id === battle.winnerId) && (
            <Button
              onClick={handleClaim}
              disabled={generateClaimSignature.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {generateClaimSignature.isPending ? "Claiming..." : "Claim Prize"}
            </Button>
          )}
      </div>

      <ScrollArea className="h-[600px] rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="space-y-4">
          {isWaiting && (
            <div className="flex flex-col items-center justify-center space-y-4">
              <DotLottieReact
                src="/animation-robot-waiting.lottie"
                loop
                autoplay
                className="h-32 w-32"
              />
              <p className="text-zinc-400">Waiting for battle to start...</p>
            </div>
          )}
          {isGeneratingRounds && (
            <div className="flex flex-col items-center justify-center space-y-4">
              <DotLottieReact
                src="/animation-robot-loader.lottie"
                loop
                autoplay
                className="h-32 w-32"
              />
              <p className="text-zinc-400">Generating next round...</p>
            </div>
          )}
          {battle.rounds?.map((round) => (
            <Card key={round.id} className="bg-zinc-900/50">
              <CardHeader>
                <CardTitle>Round {round.roundNumber}</CardTitle>
                {round.winnerId && (
                  <CardDescription>
                    Winner: {getRobotName(round.winnerId)}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {round.imageUrl && (
                  <div className="overflow-hidden rounded-lg">
                    <img
                      src={round.imageUrl}
                      alt={`Round ${round.roundNumber} battle scene`}
                      className="w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}
                <div>
                  <h4 className="font-semibold text-cyan-400">
                    Battle Description
                  </h4>
                  <p className="text-sm text-zinc-300">{round.description}</p>
                </div>
                {round.tacticalAnalysis && (
                  <div>
                    <h4 className="font-semibold text-cyan-400">
                      Tactical Analysis
                    </h4>
                    <p className="text-sm text-zinc-300">
                      {round.tacticalAnalysis}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {(!battle.rounds || battle.rounds.length === 0) &&
            !isWaiting &&
            !isGeneratingRounds && (
              <p className="text-zinc-400">No rounds yet</p>
            )}
        </div>
      </ScrollArea>
    </div>
  );
}
