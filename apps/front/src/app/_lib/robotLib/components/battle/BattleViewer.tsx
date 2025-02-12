import { useGetBattleById } from "@/app/_lib/robotLib/robotHooks";
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

interface BattleRound {
  id: `rnd${string}`;
  battleId: BattleId;
  roundNumber: number;
  description: string;
  tacticalAnalysis: string;
  winnerId: RobotId | null;
}

export function BattleViewer({ battleId }: { battleId: BattleId }) {
  const { data: battle, isLoading } = useGetBattleById(battleId);

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
            {battle.winnerId &&
              ` - Winner: Robot #${battle.winnerId.split("_")[1]}`}
          </p>
        </div>
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
                    Winner: Robot #{round.winnerId.split("_")[1]}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
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
