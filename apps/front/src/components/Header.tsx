import { useAuth } from "@/app/auth/useAuth";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { shortenAddress } from "@/lib/utils";

export function Header() {
  const { isAuthenticated, disconnectWallet, walletAddress } = useAuth();

  const handleLogout = async () => {
    try {
      await disconnectWallet();
      toast.success("Wallet disconnected");
    } catch (error) {
      toast.error("Failed to disconnect wallet");
    }
  };

  return (
    <header className="w-full border-b border-zinc-800 bg-zinc-900/50 p-4 backdrop-blur-sm">
      <div className="container mx-auto flex items-center justify-between">
        <h1 className="text-xl font-bold text-cyan-400">Robot Battle Arena</h1>

        {isAuthenticated && (
          <div className="flex items-center gap-4">
            {walletAddress && (
              <span className="font-mono text-sm text-zinc-400">
                {shortenAddress(walletAddress)}
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
      </div>
    </header>
  );
}
