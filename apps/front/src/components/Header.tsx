"use client";

import Link from "next/link";
import { Button } from "./ui/button";

interface HeaderProps {
  onEnterArena?: () => void;
}

export function Header({ onEnterArena }: HeaderProps) {

  return (
    <header className="flex items-center justify-between border-b border-cyan-800/30 bg-zinc-900/50 px-6 py-4 backdrop-blur-sm">
      <Link href="/" className="cyberpunk-title text-2xl font-bold">
        ROBOTICA
      </Link>
      <div className="flex items-center gap-4">
        <Button onClick={onEnterArena} className="cyberpunk-button">
          Enter Arena
        </Button>
      </div>
    </header>
  );
}
