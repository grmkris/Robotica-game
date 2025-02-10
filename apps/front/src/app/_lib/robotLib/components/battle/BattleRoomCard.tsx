import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import type { BattleId, RobotId, UserId } from "robot-sdk";

interface BattleCardProps {
  id: BattleId;
  createdBy: UserId;
  robot1Id: RobotId;
  createdAt: Date;
  expiresAt: Date;
  onJoin: () => void;
  isLoading?: boolean;
}

export function BattleCard({
  id,
  createdBy,
  robot1Id,
  createdAt,
  expiresAt,
  onJoin,
  isLoading,
}: BattleCardProps) {
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
