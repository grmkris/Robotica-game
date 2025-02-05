"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Loader2 } from "lucide-react";

interface CreateUsernameProps {
  onSubmit: (username: string) => Promise<void>;
  isLoading?: boolean;
}

export function CreateUsername({ onSubmit, isLoading }: CreateUsernameProps) {
  const [username, setUsername] = useState("");

  const handleSubmit = async () => {
    if (username.trim()) {
      await onSubmit(username.trim());
    }
  };

  return (
    <div className="flex gap-1">
      <Input
        placeholder="Enter a username to start chatting..."
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="grow border-border/40 bg-background/80 text-foreground backdrop-blur-sm transition-colors focus:border-primary/50"
        onKeyPress={(e) => e.key === "Enter" && !isLoading && handleSubmit()}
        disabled={isLoading}
      />
      <Button
        onClick={handleSubmit}
        disabled={isLoading}
        className="h-8 bg-primary px-2 text-primary-foreground shadow-md transition-colors hover:bg-primary/90 hover:shadow-lg"
      >
        {isLoading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          "Set Username"
        )}
      </Button>
    </div>
  );
}
