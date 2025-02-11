"use client";

import { BattlesList } from "@/app/_lib/robotLib/components/battle/BattleList";
import { useGetUserRobots } from "@/app/_lib/robotLib/robotHooks";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { RobotId } from "robot-sdk";
import { CreateBattleRoom } from "./battle/CreateBattleRoom";
import { Button } from "@/components/ui/button";
import { useState } from "react";

function UserRobots() {
  const { data, isLoading } = useGetUserRobots();
  const [currentPage, setCurrentPage] = useState(1);
  const robotsPerPage = 3;

  if (isLoading) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        Loading your robots...
      </div>
    );
  }

  const robots = data?.robots || [];
  const totalPages = Math.ceil(robots.length / robotsPerPage);
  const startIndex = (currentPage - 1) * robotsPerPage;
  const endIndex = startIndex + robotsPerPage;
  const currentRobots = robots.slice(startIndex, endIndex);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {currentRobots.map((robot) => (
          <Card
            key={robot.id}
            className="bg-zinc-900/50 backdrop-blur-sm transition-all hover:bg-zinc-900/70"
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
          </Card>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="bg-zinc-900/50 text-cyan-400 hover:bg-zinc-900/70 hover:text-cyan-300"
          >
            Previous
          </Button>
          <div className="flex items-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                onClick={() => setCurrentPage(page)}
                className={`${
                  currentPage === page
                    ? "bg-cyan-400 text-zinc-900 hover:bg-cyan-300"
                    : "bg-zinc-900/50 text-cyan-400 hover:bg-zinc-900/70 hover:text-cyan-300"
                }`}
              >
                {page}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="bg-zinc-900/50 text-cyan-400 hover:bg-zinc-900/70 hover:text-cyan-300"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

export function ClientDashboard() {
  const userRobots = useGetUserRobots();

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-black">
      <div className="container mx-auto space-y-8 p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold text-cyan-400">
              Robot Battle Arena
            </h1>
            <p className="text-zinc-400">
              Create battles and choose your fighter for each match
            </p>
          </div>
        </div>

        <section>
          <h2 className="mb-4 text-2xl font-bold text-cyan-400">Your Robots</h2>
          <UserRobots />
        </section>

        {/* Battle Arena Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-3xl font-bold text-cyan-400">
                Active Battles
              </h2>
              <p className="text-zinc-400">
                Join existing battles or create your own
              </p>
            </div>
            {userRobots.data?.robots && userRobots.data.robots.length > 0 && (
              <CreateBattleRoom />
            )}
          </div>

          <div className="mt-6">
            {userRobots.data?.robots?.length ? (
              <BattlesList />
            ) : (
              <div className="rounded-lg border border-dashed border-zinc-700 p-8 text-center">
                <p className="text-zinc-400">
                  Create a robot first to participate in battles
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
