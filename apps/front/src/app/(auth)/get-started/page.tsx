import { ConnectWallet } from "@/components/ConnectWallet";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Get Started",
  description: "Get Started",
};

export default function GetStartedPage() {
  return (
    <div className="flex h-full items-center">
      <ConnectWallet />
    </div>
  );
}
