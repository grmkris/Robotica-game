"use client";

import { useCreateRobot } from "@/app/_lib/robotLib/robotHooks";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";

// Cyberpunk loader component
function CyberpunkLoader() {
  return (
    <div className="absolute left-0 top-0 flex h-full w-full items-center justify-center backdrop-blur-sm">
      <motion.div
        className="relative h-20 w-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute inset-0 rounded-md border-2 border-cyan-500"
            initial={{ rotate: 0 }}
            animate={{
              rotate: 360,
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "linear",
            }}
            style={{
              borderRadius: "10%",
              boxShadow: "0 0 15px var(--neon-cyan)",
            }}
          />
        ))}
        <motion.div
          className="absolute inset-0 flex items-center justify-center font-mono text-sm text-cyan-400"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          CREATING
        </motion.div>
      </motion.div>
    </div>
  );
}

export function CreateRobot() {
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
    <div className="relative rounded-lg border border-zinc-700 bg-zinc-800/50 p-6 backdrop-blur-sm">
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

      {isLoading && <CyberpunkLoader />}
    </div>
  );
}
