import React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";

interface BattleRoomCardProps {
  id: string;
  createdBy: string;
  robot1Id: string;
  createdAt: string;
  expiresAt: string;
  onJoin: () => void;
  isLoading?: boolean;
}

export function BattleRoomCard({
  id,
  createdBy,
  robot1Id,
  createdAt,
  expiresAt,
  onJoin,
  isLoading,
}: BattleRoomCardProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">
          Battle Room #{id.split("_")[1]}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-sm text-muted-foreground">
          <p>Created by: {createdBy}</p>
          <p>Robot: {robot1Id}</p>
          <p>Created: {formatDistanceToNow(new Date(createdAt))} ago</p>
          <p>Expires in: {formatDistanceToNow(new Date(expiresAt))}</p>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={onJoin} disabled={isLoading} className="w-full">
          {isLoading ? "Joining..." : "Join Battle"}
        </Button>
      </CardFooter>
    </Card>
  );
}
