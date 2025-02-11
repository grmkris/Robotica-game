import {
  useJoinBattle,
  useListBattles,
  useGetUserRobots,
} from "@/app/_lib/robotLib/robotHooks";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  RobotId,
  type BattleId,
  type BattleStatus,
  type UserId,
} from "robot-sdk";
import { BattleCard } from "./BattleCard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

export function BattlesList() {
  const router = useRouter();
  const { data: userRobots } = useGetUserRobots();
  const [selectedRobotId, setSelectedRobotId] = useState<RobotId | null>(null);
  const [selectedBattleId, setSelectedBattleId] = useState<BattleId | null>(
    null,
  );

  const {
    data: battles,
    isLoading,
    refetch,
  } = useListBattles({
    page: "1",
    limit: "10",
  });

  const joinBattle = useJoinBattle();

  const handleJoinBattle = () => {
    if (!selectedRobotId || !selectedBattleId) return;

    joinBattle.mutate(
      {
        battleId: selectedBattleId,
        robotId: selectedRobotId,
      },
      {
        onSuccess: () => {
          router.push(`/battle/${selectedBattleId}`);
        },
        onError: (error) => {
          console.error("Join battle error:", error);
          // Add error handling/toast here
        },
      },
    );
  };

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
          <Dialog
            key={room.id}
            onOpenChange={(open) => {
              if (!open) {
                setSelectedRobotId(null);
                setSelectedBattleId(null);
              }
            }}
          >
            <DialogTrigger asChild>
              <div>
                <BattleCard
                  id={room.id}
                  createdBy={room.createdBy}
                  robots={room.robots}
                  createdAt={new Date(room.createdAt)}
                  completedAt={
                    room.completedAt ? new Date(room.completedAt) : null
                  }
                  onJoin={() => setSelectedBattleId(room.id)}
                  isLoading={joinBattle.isPending}
                />
              </div>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Select Your Robot</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Select
                  onValueChange={(value) =>
                    setSelectedRobotId(RobotId.parse(value))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose your robot" />
                  </SelectTrigger>
                  <SelectContent>
                    {userRobots?.robots.map((robot) => (
                      <SelectItem key={robot.id} value={robot.id}>
                        {robot.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  className="w-full"
                  disabled={!selectedRobotId || joinBattle.isPending}
                  onClick={handleJoinBattle}
                >
                  {joinBattle.isPending ? "Joining..." : "Join Battle"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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
