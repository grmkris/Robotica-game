"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import Link from "next/link";
import { BattleRoomList } from "./battle/BattleRoomList";
import { CreateBattleRoom } from "./battle/CreateBattleRoom";

type Robot = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  imageUrl?: string;
};

function UserRobots() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["userRobots"],
    queryFn: async () => {
      const response = await apiClient.robotBattle.getUserRobots();
      const json = await response.json();
      return json as {
        robots: Robot[];
        selectedRobotId: string | null;
      };
    },
  });

  const selectRobotMutation = useMutation({
    mutationFn: async (robotId: string) => {
      const response = await apiClient.robotBattle.selectActiveRobot(robotId);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userRobots"] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        Loading your robots...
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {data?.robots?.map((robot) => (
        <Card
          key={robot.id}
          className={`bg-zinc-900/50 backdrop-blur-sm transition-all hover:bg-zinc-900/70 ${
            robot.id === data.selectedRobotId
              ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
              : ""
          }`}
        >
          {robot.imageUrl && (
            <div className="relative aspect-square w-full overflow-hidden rounded-t-lg">
              <img
                src={robot.imageUrl}
                alt={robot.name}
                className="object-cover object-center"
                width={400}
                height={400}
              />
            </div>
          )}
          <CardHeader>
            <CardTitle className="text-cyan-400">{robot.name}</CardTitle>
            <CardDescription className="line-clamp-3">
              {robot.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-400">
              Created: {new Date(robot.createdAt).toLocaleDateString()}
            </p>
          </CardContent>
          <CardFooter>
            <Button
              onClick={() => selectRobotMutation.mutate(robot.id)}
              disabled={robot.id === data.selectedRobotId}
              variant={
                robot.id === data.selectedRobotId ? "secondary" : "default"
              }
              className="w-full"
            >
              {robot.id === data.selectedRobotId
                ? "Active Fighter"
                : "Select as Fighter"}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

export function ClientDashboard() {
  const { data: robotData } = useQuery({
    queryKey: ["userRobots"],
    queryFn: async () => {
      const response = await apiClient.robotBattle.getUserRobots();
      const json = await response.json();
      return json as {
        robots: Robot[];
        selectedRobotId: string | null;
      };
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-black">
      <div className="container mx-auto space-y-8 p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold text-cyan-400">
              Your Battle Robots
            </h1>
            <p className="text-zinc-400">
              Select your active fighter for the arena
            </p>
          </div>
          <div className="flex gap-4">
            <Link href="/">
              <Button variant="outline">Back to Home</Button>
            </Link>
          </div>
        </div>

        <section>
          <UserRobots />
        </section>

        {/* Add Battle Room Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-3xl font-bold text-cyan-400">Battle Arena</h2>
              <p className="text-zinc-400">
                Create or join battle rooms to fight other robots
              </p>
            </div>
            <CreateBattleRoom
              selectedRobotId={robotData?.selectedRobotId ?? null}
            />
          </div>

          <div className="mt-6">
            {robotData?.selectedRobotId ? (
              <BattleRoomList selectedRobotId={robotData.selectedRobotId} />
            ) : (
              <div className="rounded-lg border border-dashed border-zinc-700 p-8 text-center">
                <p className="text-zinc-400">
                  Select a robot first to see available battle rooms
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
