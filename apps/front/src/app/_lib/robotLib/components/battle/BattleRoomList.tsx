import { useJoinBattle, useListBattles } from "@/app/_lib/robotLib/robotHooks";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import type { BattleId, BattleStatus, RobotId, UserId } from "robot-sdk";
import { BattleCard } from "./BattleRoomCard";

interface BattleRoom {
  id: BattleId;
  createdBy: UserId;
  robot1Id: RobotId;
  createdAt: Date;
  expiresAt: Date;
}

interface JoinRoomResponse {
  battleId: BattleId;
  status: BattleStatus;
}

export function BattlesList({
  selectedRobotId,
}: {
  selectedRobotId: RobotId;
}) {
  const router = useRouter();

  const { data: battles, isLoading, refetch } = useListBattles({
    page: "1",
    limit: "10",
  });

  const joinBattle = useJoinBattle();

  if (isLoading) {
    return <div>Loading rooms...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Available Battle Rooms</h2>
        <Button onClick={() => refetch()} variant="outline">
          Refresh
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {battles?.battles.map((room) => (
          <BattleCard
            key={room.id}
            {...room}
            onJoin={() =>
              joinBattle.mutate({
                battleId: room.id,
                robotId: selectedRobotId,
              })
            }
            isLoading={joinBattle.isPending}
          />
        ))}
        {battles?.battles.length === 0 && (
          <p className="col-span-full py-8 text-center text-muted-foreground">
            No battle rooms available. Create one to start battling!
          </p>
        )}
      </div>
    </div>
  );
}
