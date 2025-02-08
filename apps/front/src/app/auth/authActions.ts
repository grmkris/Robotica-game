import { apiClient } from "@/lib/apiClient";

type ChangePasswordSchema = {
  currentPassword: string;
  newPassword: string;
};

export const getCurrentUser = async () => {
  const response = await apiClient.auth.me();
  if (response.status !== 200) {
    const text = await response.text();
    throw new Error(`Failed to fetch current user: ${text}`);
  }
  return response.json();
};

export const connectWallet = async (
  walletAddress: string,
  signature: string,
) => {
  const response = await apiClient.auth.connect(walletAddress, signature);
  if (response.status !== 200) {
    throw new Error("Failed to connect wallet");
  }
  return response.json();
};

export const disconnectWallet = async () => {
  const response = await apiClient.auth.disconnect();
  if (response.status !== 200) {
    throw new Error("Failed to disconnect wallet");
  }
  return response.json();
};

// You can add more auth-related actions here if needed, such as:
// export const login = async (credentials: LoginCredentials) => { ... }
// export const logout = async () => { ... }
// export const register = async (userData: RegisterData) => { ... }

export const changeUserPassword = async (props: {
  data: ChangePasswordSchema;
}) => {
  const response = await apiClient.auth.changePassword(props.data);
  if (response.status !== 200) {
    throw new Error("Failed to change user password");
  }
  return response.json();
};

export const updateUser = async (data: { username?: string }) => {
  const response = await apiClient.auth.updateMe(data);
  if (response.status !== 200) {
    throw new Error("Failed to update user");
  }
  return response.json();
};

export const getNonce = async () => {
  const response = await apiClient.auth.getNonce();
  if (response.status !== 200) {
    throw new Error("Failed to get nonce");
  }
  return response.json();
};

export const verifySignature = async (message: string, signature: string) => {
  const response = await apiClient.auth.verify(message, signature);
  if (response.status !== 200) {
    throw new Error("Failed to verify signature");
  }
  return response.json();
};
