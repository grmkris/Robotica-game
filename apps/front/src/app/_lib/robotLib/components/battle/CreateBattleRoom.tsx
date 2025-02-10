import { useCreateBattle } from "@/app/_lib/robotLib/robotHooks";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RobotId } from "robot-sdk";

interface CreateBattleRoomProps {
  selectedRobotId: string | null;
}

interface CreateRoomResponse {
  roomId: string;
  battleId: string | null;
}

export function CreateBattleRoom({ selectedRobotId }: CreateBattleRoomProps) {
  const queryClient = useQueryClient();
  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null);
  const router = useRouter();

  const createBattleMutation = useCreateBattle();

  return (
    <Button
      onClick={() => createBattleMutation.mutate({ robot1Id: RobotId.parse(selectedRobotId) })}
      disabled={!selectedRobotId || createBattleMutation.isPending}
      className="w-full"
    >
      {createBattleMutation.isPending
        ? "Creating..."
        : createdRoomId
          ? "Waiting for opponent..."
          : selectedRobotId
            ? "Create Battle Room"
            : "Select a Robot First"}
    </Button>
  );
}
