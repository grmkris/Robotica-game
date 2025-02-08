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

export function useAuth() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await getCurrentUser();
        console.log("User data:", user);
        setIsAuthenticated(!!user);
      } catch (error) {
        console.error("Auth check failed:", error);
        setIsAuthenticated(false);
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
    },
  });

  return {
    isAuthenticated,
    isLoading,
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
