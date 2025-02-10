import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/apiClient";
import { useRouter } from "next/navigation";

interface CreateBattleRoomProps {
  selectedRobotId: string | null;
}

interface CreateRoomResponse {
  roomId: string;
  battleId: string | null;
}

interface RoomEventData {
  room: {
    id: string;
    status: string;
    battleId: string | null;
  };
}

export function CreateBattleRoom({ selectedRobotId }: CreateBattleRoomProps) {
  const queryClient = useQueryClient();
  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null);
  const router = useRouter();

  const createRoomMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRobotId) {
        throw new Error("No robot selected");
      }
      const response = await apiClient.robotBattle.createRoom(selectedRobotId);
      return response.json() as Promise<CreateRoomResponse>;
    },
    onSuccess: (data) => {
      toast.success("Battle room created!", {
        description: "Waiting for opponent...",
      });
      setCreatedRoomId(data.roomId);
      queryClient.invalidateQueries({ queryKey: ["battleRooms"] });
    },
    onError: (error) => {
      toast.error("Failed to create room", {
        description: error.message,
      });
    },
  });

  // Listen for battle start
  useEffect(() => {
    if (!createdRoomId) return;

    console.log("Setting up SSE listener for room:", createdRoomId);
    const eventSource = apiClient.robotBattle.getRoomEvents(createdRoomId);

    eventSource.onmessage = (event) => {
      console.log("Received SSE event:", event.data);
      const data = JSON.parse(event.data) as RoomEventData;
      console.log("Parsed data:", data);

      if (data.room.battleId) {
        console.log("Got battleId, redirecting to:", data.room.battleId);
        router.push(`/robot-battle/battle/${data.room.battleId}`);
        eventSource.close();
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE Error:", error);
    };

    return () => {
      console.log("Cleaning up SSE listener");
      eventSource.close();
    };
  }, [createdRoomId, router]);

  return (
    <Button
      onClick={() => createRoomMutation.mutate()}
      disabled={!selectedRobotId || createRoomMutation.isPending}
      className="w-full"
    >
      {createRoomMutation.isPending
        ? "Creating..."
        : createdRoomId
          ? "Waiting for opponent..."
          : selectedRobotId
            ? "Create Battle Room"
            : "Select a Robot First"}
    </Button>
  );
}
