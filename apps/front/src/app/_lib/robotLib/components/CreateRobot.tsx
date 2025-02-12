"use client";

import { useCreateRobot } from "@/app/_lib/robotLib/robotHooks";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { IsometricLoader } from "./IsometricLoader";

export const CreateRobot = () => {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const createRobot = useCreateRobot();

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!prompt.trim()) return;

      setIsLoading(true);
      try {
        await createRobot.mutateAsync({ prompt });
        toast.success("Robot created successfully!");
        // Wrap state updates in a setTimeout to avoid React state updates during rendering
        setTimeout(() => {
          setPrompt("");
          setIsLoading(false);
        }, 0);
      } catch (error) {
        console.error("Error creating robot:", error);
        toast.error("Failed to create robot");
        setIsLoading(false);
      }
    },
    [prompt, createRobot],
  );

  const handlePromptChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setPrompt(e.target.value);
    },
    [],
  );

  return (
    <div
      className="relative h-[600px] w-full bg-cover bg-bottom bg-no-repeat"
      style={{
        backgroundImage: "url(/robot-creator.png)",
        width: "100vw",
        marginLeft: "calc(-50vw + 50%)",
        marginRight: "calc(-50vw + 50%)",
      }}
    >
      <div className="container mx-auto p-4">
        <div className="relative rounded-lg border border-zinc-700 bg-zinc-800/70 p-6 backdrop-blur-sm">
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
                onChange={handlePromptChange}
                placeholder="Example: A heavily armored robot with plasma cannons and advanced targeting systems..."
                className="h-32 border-zinc-700 bg-zinc-900/50 focus:border-cyan-500"
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading || !prompt.trim()}
              className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-700"
            >
              {isLoading ? "Creating..." : "Create Robot"}
            </Button>
          </form>

          {isLoading && <IsometricLoader />}
        </div>
      </div>
    </div>
  );
};
