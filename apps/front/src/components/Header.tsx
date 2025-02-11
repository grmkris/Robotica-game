"use client";

import { ConnectWallet } from "./ConnectWallet";
import Link from "next/link";
import { useAuth } from "@/app/auth/useAuth";
import { Button } from "./ui/button";

interface HeaderProps {
  onEnterArena?: () => void;
}

export function Header({ onEnterArena }: HeaderProps) {
  const { isAuthenticated } = useAuth();

  return (
    <header className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/50 px-6 py-4 backdrop-blur-sm">
      <Link href="/" className="text-xl font-bold text-cyan-400">
        Robot Battle Arena
      </Link>
      <div className="flex items-center gap-4">
        {isAuthenticated ? (
          <Button
            onClick={onEnterArena}
            className="transform rounded-lg bg-cyan-500 px-6 py-2 text-sm font-bold text-black shadow-lg shadow-cyan-500/50 transition-all duration-200 hover:scale-105 hover:bg-cyan-600"
          >
            Enter Arena
          </Button>
        ) : (
          <ConnectWallet />
        )}
      </div>
    </header>
  );
}
