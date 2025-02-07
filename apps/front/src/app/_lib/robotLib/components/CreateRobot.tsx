"use client";

import { useState } from "react";
import { apiClient } from "@/lib/apiClient";

export function CreateRobot() {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await apiClient["create-robot"].$post({
        json: { prompt },
      });
      setPrompt("");
    } catch (error) {
      console.error("Error creating robot:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto my-8 max-w-md">
      <div className="flex flex-col gap-4">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your robot..."
          className="rounded border p-2"
          rows={4}
        />
        <button
          type="submit"
          disabled={isLoading}
          className="rounded bg-blue-500 px-4 py-2 text-white disabled:bg-gray-400"
        >
          {isLoading ? "Creating..." : "Create Robot"}
        </button>
      </div>
    </form>
  );
}
