"use client";

import { ClientDashboard } from "../_lib/robotLib/components/ClientDashboard";
import { CreateRobot } from "../_lib/robotLib/components/CreateRobot";
import { useAuth } from "../auth/useAuth";
import { Header } from "@/components/Header";
import { useGetUserRobots } from "../_lib/robotLib/robotHooks";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { IsometricLoader } from "../_lib/robotLib/components/IsometricLoader";

export default function DashboardPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const { data: userRobots } = useGetUserRobots();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <IsometricLoader />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-900 text-white">
      <Header />
      <main className="container mx-auto flex-1 p-6">
        <Tabs
          defaultValue={userRobots?.robots?.length ? "arena" : "create"}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Create Robot</TabsTrigger>
            <TabsTrigger value="arena" disabled={!userRobots?.robots?.length}>
              Battle Arena
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-4">
            <div className="mx-auto max-w-2xl">
              <CreateRobot />
            </div>
          </TabsContent>

          <TabsContent value="arena">
            <ClientDashboard />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
