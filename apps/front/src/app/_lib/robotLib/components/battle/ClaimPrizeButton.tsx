import { Button } from "@/components/ui/button";
import { useState } from "react";
import type { BattleId } from "robot-sdk";
import { toast } from "sonner";
import { useAccount } from "wagmi";

interface ClaimPrizeButtonProps {
  gameId: bigint;
  battleId: BattleId;
  prizeAmount: bigint;
  disabled?: boolean;
}

export function ClaimPrizeButton({
  gameId,
  prizeAmount,
  disabled,
}: ClaimPrizeButtonProps) {
  const { address } = useAccount();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleClaim = async () => {
    if (!address) return;

    try {
      setIsProcessing(true);
      // Simulate a delay to mimic transaction time
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success("Prize claimed successfully! (Test mode)");
    } catch (error) {
      console.error("Error claiming prize:", error);
      toast.error("Failed to claim prize");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Button
      onClick={handleClaim}
      disabled={disabled || !address || isProcessing}
      variant="default"
      className="w-full bg-green-600 hover:bg-green-500 disabled:bg-green-800"
    >
      {isProcessing
        ? "Processing Claim..."
        : `Claim Prize (${prizeAmount} AVAX) (Test Mode)`}
    </Button>
  );
}
