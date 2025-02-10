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
  updateUser
} from "./authActions";


export function useAuth() {
  const {
    data: user,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["currentUser"],
    queryFn: getCurrentUser,
  });

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
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
