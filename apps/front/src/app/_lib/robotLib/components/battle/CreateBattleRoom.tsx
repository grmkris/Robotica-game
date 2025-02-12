import {
  useCreateBattle,
  useGetUserRobots,
} from "@/app/_lib/robotLib/robotHooks";
import { Button } from "@/components/ui/button";
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
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RobotId } from "robot-sdk";

export function CreateBattleRoom() {
  const router = useRouter();
  const [selectedRobotId, setSelectedRobotId] = useState<RobotId | null>(null);
  const { data: userRobots } = useGetUserRobots();
  const createBattleMutation = useCreateBattle();

  const handleCreateBattle = () => {
    if (!selectedRobotId) return;

    createBattleMutation.mutate(
      { robot1Id: selectedRobotId },
      {
        onSuccess: (data) => {
          console.log("Battle created:", data);
          router.push(`/battle/${data.battleId}`);
        },
      },
    );
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Create Battle</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Battle</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Select
            onValueChange={(value) => setSelectedRobotId(RobotId.parse(value))}
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
            disabled={!selectedRobotId || createBattleMutation.isPending}
            onClick={handleCreateBattle}
          >
            {createBattleMutation.isPending ? "Creating..." : "Create Battle"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
