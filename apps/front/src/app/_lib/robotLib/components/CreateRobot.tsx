"use client";

import { useCreateRobot } from "@/app/_lib/robotLib/robotHooks";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "sonner";

export function CreateRobot() {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const createRobot = useCreateRobot();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await createRobot.mutateAsync({ prompt });
      toast.success("Robot created successfully!");
      setPrompt("");
    } catch (error) {
      console.error("Error creating robot:", error);
      toast.error("Failed to create robot");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-6 backdrop-blur-sm">
      <h3 className="mb-4 text-xl font-semibold text-cyan-400">
        Design Your Battle Robot
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="prompt" className="text-sm text-zinc-300">
            Describe your robot
          </label>
          <Textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Example: A heavily armored robot with plasma cannons and advanced targeting systems..."
            className="h-32 border-zinc-700 bg-zinc-900/50 focus:border-cyan-500"
          />
        </div>

        <Button
          type="submit"
          disabled={isLoading || !prompt}
          className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-700"
        >
          {isLoading ? "Creating..." : "Create Robot"}
        </Button>
      </form>
    </div>
  );
}
