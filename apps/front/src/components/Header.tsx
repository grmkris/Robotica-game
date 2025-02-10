import { useAuth } from "@/app/auth/useAuth";
import { shortenAddress } from "@/lib/utils";
import Link from "next/link";
import { toast } from "sonner";
import { useDisconnect } from "wagmi";
import { Button } from "./ui/button";
export function Header() {
  const { isAuthenticated, user, isLoading } = useAuth();
  const disconnect = useDisconnect();

  const handleLogout = async () => {
    try {
      await disconnect.disconnectAsync();
      toast.success("Wallet disconnected");
    } catch (error) {
      console.error(error);
      toast.error("Failed to disconnect wallet");
    }
  };

  return (
    <header className="w-full border-b border-zinc-800 bg-zinc-900/50 p-4 backdrop-blur-sm">
      <div className="container mx-auto flex items-center justify-between">
        <h1 className="text-xl font-bold text-cyan-400">Robot Battle Arena</h1>

        {isAuthenticated && (
          <div className="flex items-center gap-4">
            {user?.wallets[0] && (
              <span className="font-mono text-sm text-zinc-400">
                {shortenAddress(user.wallets[0].address)}
              </span>
            )}
            <Button
              variant="destructive"
              onClick={handleLogout}
              className="hover:bg-red-600"
            >
              Disconnect Wallet
            </Button>
          </div>
        )}

        <nav className="flex items-center gap-4">
          <Link
            href="/robot-battle"
            className="text-foreground transition-colors hover:text-primary"
          >
            Robot Battle
          </Link>
        </nav>
      </div>
    </header>
  );
}
