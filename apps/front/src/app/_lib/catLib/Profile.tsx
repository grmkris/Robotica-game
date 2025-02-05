"use client";

import { useGetCats, useMishaLeaderboard } from "@/app/_lib/catLib/catHooks";
import { useAuth, useUpdateUsername } from "@/app/auth/useAuth";
import { ConnectWallet } from "@/components/ConnectWallet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingBag } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function formatPurrlons(purrlons: number | undefined): string {
  if (!purrlons) return "0";
  return purrlons.toString();
}

export function Profile() {
  const { user, isLoading } = useAuth();
  const cats = useGetCats();
  const leaderboard = useMishaLeaderboard({ catId: cats.data?.[0]?.id });
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState("");

  const updateUsername = useUpdateUsername({
    onSuccess: () => {
      setIsEditingUsername(false);
      toast.success("Username updated successfully!");
    },
    onError: () => {
      toast.error("Failed to update username");
    },
  });

  if (isLoading) {
    return (
      <ScrollArea className="h-full">
        <div className="space-y-4 p-2">
          <Card className="p-4">
            <div className="flex items-center space-x-4">
              <Skeleton className="size-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-4 w-[150px]" />
              </div>
            </div>
          </Card>
        </div>
      </ScrollArea>
    );
  }

  if (!user) {
    return (
      <ScrollArea className="h-full">
        <div className="space-y-4 p-2">
          <Card className="p-4">
            <p className="text-muted-foreground">
              Please connect to view profile
            </p>
            <ConnectWallet />
          </Card>
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-2">
        <Card className="p-4">
          <div className="space-y-4">
            {/* User Profile Header */}
            <div className="flex items-center space-x-4">
              <Avatar>
                <AvatarImage src={undefined} />
                <AvatarFallback>
                  {user.username?.[0]?.toUpperCase() ?? "U"}
                </AvatarFallback>
              </Avatar>
              <div className="grow">
                {isEditingUsername ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      updateUsername.mutate({ username: newUsername });
                    }}
                    className="space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <Input
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        placeholder="New username"
                        className="h-8 max-w-[200px]"
                        autoFocus
                      />
                      <div className="flex gap-1">
                        <Button
                          type="submit"
                          size="sm"
                          disabled={updateUsername.isPending}
                          className="h-8"
                        >
                          {updateUsername.isPending ? "Saving..." : "Save"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsEditingUsername(false)}
                          className="h-8"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center gap-2">
                    <h3 className="font-pixel text-lg text-primary">
                      {user.username ?? "Anonymous User"}
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => {
                        setNewUsername(user.username ?? "");
                        setIsEditingUsername(true);
                      }}
                    >
                      ✏️ Edit
                    </Button>
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  Member since{" "}
                  {new Date(user.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>

            {/* Wallet Connection */}
            <div className="rounded-lg bg-muted p-3">
              <h4 className="font-pixel mb-2 text-sm text-primary">Wallet</h4>
              <ConnectWallet />
            </div>

            <div className="rounded-lg bg-muted p-3">
              <h4 className="font-pixel text-sm text-primary">Balance</h4>
              <div className="mt-1 flex items-center justify-between">
                <p className="text-2xl font-bold">
                  {formatPurrlons(user.purrlons)} Purrlons
                </p>
                <Button variant="secondary" size="sm">
                  <ShoppingBag className="size-4" />
                  Buy
                </Button>
              </div>
            </div>

            {/* Cat Affections */}
            {user.catUserAffections.length > 0 && (
              <div>
                <h4 className="font-pixel mb-2 text-sm text-primary">
                  Cat relationship:
                </h4>
                <div className="space-y-2">
                  {user.catUserAffections.map((affection) => (
                    <div
                      key={affection.id}
                      className="flex items-center justify-between rounded-lg bg-muted p-3"
                    >
                      <span className="text-sm">
                        {cats.data?.find((cat) => cat.id === affection.catId)
                          ?.name ?? "Unknown Cat"}
                      </span>
                      <span className="font-medium">
                        Affection: {affection.affection}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-4">
          <h4 className="font-pixel mb-4 text-lg text-primary">
            Misha&apos;s Favorites
          </h4>
          {leaderboard.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : leaderboard.error ? (
            <p className="text-sm text-muted-foreground">
              Failed to load leaderboard
            </p>
          ) : (
            <div className="space-y-2">
              {leaderboard.data?.map((entry) => (
                <div
                  key={entry.userId}
                  className={`flex items-center justify-between rounded-lg p-3 ${
                    entry.userId === user?.id
                      ? "bg-primary/10 dark:bg-primary/20"
                      : "bg-muted"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-pixel min-w-8 text-lg text-primary">
                      #{entry.rank}
                    </span>
                    <div>
                      <p className="max-w-[150px] truncate font-medium">
                        {entry.username}
                        {entry.userId === user?.id && " (You)"}
                      </p>
                    </div>
                  </div>
                  <span className="font-medium">
                    {entry.affectionLevel.toFixed(1)} ❤️
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </ScrollArea>
  );
}
