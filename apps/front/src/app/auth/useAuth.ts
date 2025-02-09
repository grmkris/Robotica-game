"use client";

export const ChangePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string(),
});
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  changeUserPassword,
  getCurrentUser,
  updateUser,
  connectWallet,
  disconnectWallet,
} from "./authActions";
import { useEffect, useState } from "react";

// Define the session type based on the actual response
type Session = {
  id: string;
  username: string;
  email: string | null;
  name: string | null;
  normalizedEmail: string | null;
} | null;

// Add type for the user response
type User = {
  id: string;
  walletAddress?: string;
  // ... other user fields
};

export function useAuth() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = (await getCurrentUser()) as Session;
        console.log("Auth state:", session);
        setIsAuthenticated(!!session);
        // Get wallet address from session id
        setWalletAddress(session?.id || null);
      } catch (error) {
        console.error("Auth check failed:", error);
        setIsAuthenticated(false);
        setWalletAddress(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const connectWalletMutation = useMutation({
    mutationFn: async ({
      walletAddress,
      signature,
    }: {
      walletAddress: string;
      signature: string;
    }) => {
      return connectWallet(walletAddress, signature);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    },
  });

  const disconnectWalletMutation = useMutation({
    mutationFn: disconnectWallet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      setWalletAddress(null);
    },
  });

  return {
    isAuthenticated,
    isLoading,
    walletAddress,
    connectWallet: connectWalletMutation.mutateAsync,
    disconnectWallet: disconnectWalletMutation.mutateAsync,
  };
}

export function useChangeUserPassword({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
} = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      data,
    }: {
      data: z.infer<typeof ChangePasswordSchema>;
    }) => {
      return changeUserPassword({ data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["currentUser"],
      });
      onSuccess?.();
    },
    onError: (error: unknown) => {
      console.error("Failed to change user password:", error);
      onError?.(error);
    },
  });
}

export function useUpdateUsername({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
} = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ username }: { username: string }) => {
      return updateUser({ username });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["currentUser"],
      });
      onSuccess?.();
    },
    onError: (error: unknown) => {
      console.error("Failed to update username:", error);
      onError?.(error);
    },
  });
}
