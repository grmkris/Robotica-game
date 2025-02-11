"use client";

import { ClientDashboard } from "./_lib/robotLib/components/ClientDashboard";
import { CreateRobot } from "./_lib/robotLib/components/CreateRobot";
import { ConnectWallet } from "@/components/ConnectWallet";
import { useAuth } from "./auth/useAuth";
import { Header } from "@/components/Header";
import { useGetUserRobots } from "./_lib/robotLib/robotHooks";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const { data: userRobots } = useGetUserRobots();

  console.log("Auth state:", { isAuthenticated, isLoading });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="flex flex-1 flex-col items-center justify-center">
          <h2 className="mb-8 text-2xl font-bold text-cyan-400">
            Connect your wallet to enter the arena
          </h2>
          <ConnectWallet />
        </div>
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
