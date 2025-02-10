import React, { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { BattleRoomCard } from "./BattleRoomCard";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { apiClient } from "@/lib/apiClient";
import { useRouter } from "next/navigation";

interface BattleRoom {
  id: string;
  createdBy: string;
  robot1Id: string;
  createdAt: string;
  expiresAt: string;
}

interface JoinRoomResponse {
  battleId: string;
  status: string;
}

interface RoomEventData {
  room: {
    id: string;
    status: string;
    battleId: string | null;
  };
  battle?: {
    id: string;
  };
}

export function BattleRoomList({
  selectedRobotId,
}: {
  selectedRobotId: string;
}) {
  const router = useRouter();

  const {
    data: rooms,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["battleRooms"],
    queryFn: async () => {
      const response = await apiClient.robotBattle.listRooms();
      const json = await response.json();
      return json as BattleRoom[];
    },
  });

  const joinMutation = useMutation({
    mutationFn: async (roomId: string) => {
      const response = await apiClient.robotBattle.joinRoom({
        roomId,
        robotId: selectedRobotId,
      });
      return response.json() as Promise<JoinRoomResponse>;
    },
    onSuccess: (data) => {
      toast.success("Joined battle room!", {
        description: "Battle starting...",
      });
      router.push(`/robot-battle/battle/${data.battleId}`);
    },
    onError: (error) => {
      toast.error("Failed to join room", {
        description: error.message,
      });
    },
  });

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
        {rooms?.map((room) => (
          <BattleRoomCard
            key={room.id}
            {...room}
            onJoin={() => joinMutation.mutate(room.id)}
            isLoading={joinMutation.isPending}
          />
        ))}
        {rooms?.length === 0 && (
          <p className="col-span-full py-8 text-center text-muted-foreground">
            No battle rooms available. Create one to start battling!
          </p>
        )}
      </div>
    </div>
  );
}
