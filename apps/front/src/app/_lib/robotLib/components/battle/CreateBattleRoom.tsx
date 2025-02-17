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
import { toast } from "sonner";
import { useAccount } from "wagmi";

export function CreateBattleRoom() {
  const router = useRouter();
  const { address } = useAccount();
  const [selectedRobotId, setSelectedRobotId] = useState<RobotId | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { data: userRobots } = useGetUserRobots();
  const createBattleMutation = useCreateBattle();

  const handleCreateBattle = async () => {
    if (!selectedRobotId || !address) return;

    try {
      setIsProcessing(true);

      // 1. Create battle in our backend
      const battleData = await createBattleMutation.mutateAsync({
        robot1Id: selectedRobotId,
      });

      // 4. Navigate to battle page
      router.push(`/battle/${battleData.battleId}`);
      toast.success("Battle created successfully!");
    } catch (error) {
      console.error("Error creating battle:", error);
      toast.error("Failed to create battle");
    } finally {
      setIsProcessing(false);
    }
  };

  const isButtonDisabled =
    !selectedRobotId ||
    !address ||
    isProcessing ||
    createBattleMutation.isPending;

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
            disabled={isButtonDisabled}
            onClick={handleCreateBattle}
          >
            {isProcessing ? "Processing Transaction..." : "Create Battle"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
