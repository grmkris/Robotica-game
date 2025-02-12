import { useState } from "react";
import { useAccount } from "wagmi";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useGenerateClaimSignature } from "../../robotHooks";
import { claimPrize } from "../../robotContract";
import type { BattleId } from "robot-sdk";

interface ClaimPrizeButtonProps {
  battleId: BattleId;
  prizeAmount: string;
  disabled?: boolean;
}

export function ClaimPrizeButton({
  battleId,
  prizeAmount,
  disabled,
}: ClaimPrizeButtonProps) {
  const { address } = useAccount();
  const [isProcessing, setIsProcessing] = useState(false);
  const generateSignature = useGenerateClaimSignature();

  const handleClaim = async () => {
    if (!address) return;

    try {
      setIsProcessing(true);

      // 1. Get claim signature from backend
      const signatureData = await generateSignature.mutateAsync({
        gameId: battleId,
        userAddress: address,
        amount: prizeAmount,
      });

      // 2. Send transaction using user's wallet and wait for confirmation
      await claimPrize(battleId, prizeAmount, signatureData.signature);

      toast.success("Prize claimed successfully!");
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
        : `Claim Prize (${prizeAmount} AVAX)`}
    </Button>
  );
}
