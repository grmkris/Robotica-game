import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface BattleRound {
  id: string;
  battleId: string;
  roundNumber: number;
  description: string;
  tacticalAnalysis: string;
  robot1Action: string;
  robot2Action: string;
  roundWinnerId: string;
}

interface Battle {
  id: string;
  robot1Id: string;
  robot2Id: string;
  status: "IN_PROGRESS" | "COMPLETED";
  winnerId: string | null;
  startedAt: string;
  completedAt: string | null;
  rounds: BattleRound[];
}

// Add this interface for SSE event data
interface RoomEventData {
  room: {
    id: string;
    status: string;
    // ... other room fields
  };
  battle: Battle | null;
  rounds: BattleRound[];
}

export function BattleViewer({ battleId }: { battleId: string }) {
  const [battle, setBattle] = useState<Battle | null>(null);
  const [isWaiting, setIsWaiting] = useState(true);

  useEffect(() => {
    if (!battleId) return;

    // Initial battle fetch
    const fetchBattle = async () => {
      try {
        const response = await apiClient.robotBattle.getBattleStatus(battleId);
        const data = (await response.json()) as Battle;
        setBattle(data);
        setIsWaiting(false);
      } catch (error) {
        console.error("Failed to fetch battle:", error);
      }
    };

    fetchBattle();

    // Set up polling for battle updates
    const interval = setInterval(fetchBattle, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [battleId]);

  if (isWaiting) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <p className="text-zinc-400">Loading battle...</p>
      </div>
    );
  }

  if (!battle) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <p className="text-zinc-400">Loading battle...</p>
      </div>
    );
  }

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
          {battle.rounds.map((round) => (
            <Card key={round.id} className="bg-zinc-900/50">
              <CardHeader>
                <CardTitle>Round {round.roundNumber}</CardTitle>
                <CardDescription>
                  Winner: Robot #{round.roundWinnerId.split("_")[1]}
                </CardDescription>
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-cyan-400">Robot 1</h4>
                    <p className="text-sm text-zinc-300">
                      {round.robot1Action}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-cyan-400">Robot 2</h4>
                    <p className="text-sm text-zinc-300">
                      {round.robot2Action}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
