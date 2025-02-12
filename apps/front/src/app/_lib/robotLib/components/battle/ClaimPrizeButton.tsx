import { Button } from "@/components/ui/button";
import { useState } from "react";
import type { BattleId } from "robot-sdk";
import { toast } from "sonner";
import { useAccount, useWalletClient } from "wagmi";
import { claimPrize } from "../../robotContract";
import { useGenerateClaimSignature } from "../../robotHooks";

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
  const generateSignature = useGenerateClaimSignature();
  const walletClient = useWalletClient();

  const handleClaim = async () => {
    if (!address) return;

    try {
      setIsProcessing(true);

      // 1. Get claim signature from backend
      const signatureData = await generateSignature.mutateAsync({
        gameId: gameId,
        userAddress: address,
        amount: prizeAmount,
      });

      if (!walletClient.data) {
        throw new Error("Wallet client not found");
      }

      // 2. Send transaction using user's wallet and wait for confirmation
      await claimPrize({
        gameId: gameId,
        amount: prizeAmount,
        signature: signatureData.signature,
        walletClient: walletClient.data,
      });

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
