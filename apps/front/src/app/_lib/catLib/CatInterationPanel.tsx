"use client";

import { useCatState } from "@/app/_lib/catLib/catHooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { CatId } from "cat-sdk";
import type { User } from "lucia";
import { Cat, ShoppingBag, UserIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { CatChatController } from "./CatChatController";
import { ItemStore } from "./ItemStore";
import { Profile } from "./Profile";

interface CatStatsProps {
  catId: CatId;
}

export function CatInterationPanel({ catId }: CatStatsProps) {
  const { data: catState, isLoading } = useCatState(catId);
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = searchParams.get("view");

  if (isLoading) {
    return (
      <Card className="absolute inset-x-0 bottom-0 flex h-[calc(60vh+env(safe-area-inset-bottom))] w-full flex-col overflow-hidden border-t-2 border-primary bg-gradient-to-br from-background/95 to-muted/95 shadow-lg backdrop-blur-sm sm:fixed sm:left-auto sm:right-0 sm:top-0 sm:h-screen sm:w-[450px] sm:border-l-2 sm:border-t-0">
        <CardContent className="flex-1 overflow-y-auto p-4">
          <div className="flex flex-col gap-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const getViewContent = () => {
    switch (view) {
      case "store":
        return <ItemStore />;
      case "profile":
        return <Profile />;
      default:
        return <CatChatController catId={catId} />;
    }
  };

  return (
    <Card className="absolute inset-x-0 bottom-0 flex h-[calc(60vh+env(safe-area-inset-bottom))] w-full flex-col overflow-hidden rounded-r-none border-t-2 border-primary bg-gradient-to-br from-background/95 to-muted/95 shadow-lg backdrop-blur-sm sm:fixed sm:left-auto sm:right-0 sm:top-0 sm:h-screen sm:w-[450px] sm:border-l-2 sm:border-t-0">
      {/* Desktop Navigation - Hidden on mobile */}
      <CardHeader className="hidden shrink-0 border-b border-primary py-1 sm:block">
        <CardTitle className="font-pixel flex flex-col gap-1 text-xl text-primary sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full gap-1">
            <Button
              variant={!view ? "default" : "outline"}
              size="icon"
              onClick={() => router.push("/")}
              className="size-12 flex-1"
            >
              <Cat className="size-8" />
            </Button>
            <Button
              variant={view === "store" ? "default" : "outline"}
              size="icon"
              onClick={() => router.push("/?view=store")}
              className="size-12 flex-1"
            >
              <ShoppingBag className="size-8" />
            </Button>
            <Button
              variant={view === "profile" ? "default" : "outline"}
              size="icon"
              onClick={() => router.push("/?view=profile")}
              className="size-12 flex-1"
            >
              <UserIcon className="size-8" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-0 pb-[60px] sm:pb-0">
        {getViewContent()}
      </CardContent>

      {/* Mobile Navigation - Fixed at bottom */}
      <div className="fixed inset-x-0 bottom-0 border-t border-primary bg-background/95 p-1 backdrop-blur-sm sm:hidden">
        <div className="flex w-full gap-0.5 pb-safe-bottom">
          <Button
            variant={!view ? "default" : "outline"}
            size="icon"
            onClick={() => router.push("/")}
            className="size-10 flex-1"
          >
            <Cat className="size-6" />
          </Button>
          <Button
            variant={view === "store" ? "default" : "outline"}
            size="icon"
            onClick={() => router.push("/?view=store")}
            className="size-10 flex-1"
          >
            <ShoppingBag className="size-6" />
          </Button>
          <Button
            variant={view === "profile" ? "default" : "outline"}
            size="icon"
            onClick={() => router.push("/?view=profile")}
            className="size-10 flex-1"
          >
            <UserIcon className="size-6" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
