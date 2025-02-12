import {
  useCreateBattle,
  useGetUserRobots,
  useGenerateGameSignature,
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
import { useAccount } from "wagmi";
import { toast } from "sonner";
import { enterGame } from "../../robotContract";

export function CreateBattleRoom() {
  const router = useRouter();
  const { address } = useAccount();
  const [selectedRobotId, setSelectedRobotId] = useState<RobotId | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { data: userRobots } = useGetUserRobots();
  const createBattleMutation = useCreateBattle();
  const generateSignature = useGenerateGameSignature();

  const handleCreateBattle = async () => {
    if (!selectedRobotId || !address) return;

    try {
      setIsProcessing(true);

      // 1. Create battle in our backend
      const battleData = await createBattleMutation.mutateAsync({
        robot1Id: selectedRobotId,
      });

      // 2. Get signature from backend
      const signatureData = await generateSignature.mutateAsync({
        gameId: battleData.battleId,
        userAddress: address,
      });

      // 3. Send transaction using user's wallet and wait for confirmation
      await enterGame(battleData.battleId, signatureData.signature);

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
    createBattleMutation.isPending ||
    generateSignature.isPending;

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
            {isProcessing
              ? "Processing Transaction..."
              : createBattleMutation.isPending || generateSignature.isPending
                ? "Creating..."
                : "Create Battle"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
