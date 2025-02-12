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
  robots: {
    id: RobotId;
    name: string;
    imageUrl?: string | null | undefined;
  }[];
  createdAt: Date;
  completedAt: Date | null;
  onJoin: () => void;
  isLoading?: boolean;
  gameId: number;
}

export function BattleCard({
  id,
  createdBy,
  robots,
  createdAt,
  completedAt,
  onJoin,
  isLoading,
  gameId,
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
          <p>Robots: {robots.map((robot) => robot.name).join(", ")}</p>
          <p>Created: {formatDistanceToNow(new Date(createdAt))} ago</p>
          <p>
            Completed:{" "}
            {completedAt
              ? formatDistanceToNow(new Date(completedAt))
              : "Not completed"}
          </p>
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
