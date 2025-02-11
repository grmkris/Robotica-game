"use client";

import { useAuth } from "@/app/auth/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { IsometricLoader } from "@/app/_lib/robotLib/components/IsometricLoader";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/get-started");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <IsometricLoader />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
