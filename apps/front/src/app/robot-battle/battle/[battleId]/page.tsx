"use client";

import { BattleViewer } from "@/app/_lib/robotLib/components/battle/BattleViewer";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function BattlePage() {
  const params = useParams();
  const battleId = params.battleId as string;

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-black">
      <div className="container mx-auto space-y-8 p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold text-cyan-400">Robot Battle</h1>
            <p className="text-zinc-400">
              Watch the battle unfold in real-time
            </p>
          </div>
          <div className="flex gap-4">
            <Link href="/robot-battle">
              <Button variant="outline">Back to Arena</Button>
            </Link>
          </div>
        </div>

        <BattleViewer battleId={battleId} />
      </div>
    </div>
  );
}
