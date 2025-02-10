import { robotClient } from "@/app/_lib/robotLib/robotClient";


type ChangePasswordSchema = {
  currentPassword: string;
  newPassword: string;
};

export async function getCurrentUser() {
  const response = await robotClient.auth.me.$get();
  if (!response.ok) return null;
  return response.json();
}

export async function connectWallet(walletAddress: string, signature: string) {
  const response = await robotClient.auth.siwe.verify.$post({
    json: { message: walletAddress, signature },
  });
  if (!response.ok) throw new Error("Failed to connect wallet");
  return response.json();
}

export async function disconnectWallet() {
  const response = await robotClient.auth.logout.$get({ query: { redirect: undefined } });
  if (!response.ok) throw new Error("Failed to disconnect wallet");
  return response.json();
}

export const changeUserPassword = async (props: {
  data: ChangePasswordSchema;
}) => {
  const response = await robotClient.auth["change-password"].$post({
    json: props.data,
  });
  if (response.status !== 200) {
    throw new Error("Failed to change user password");
  }
  return response.json();
};

export async function updateUser(data: { username?: string }) {
  const response = await robotClient.auth.me.$put({
    json: data,
  });
  if (!response.ok) throw new Error("Failed to update user");
  return response.json();
}

export async function getNonce() {
  const response = await robotClient.auth.siwe.nonce.$get();
  if (!response.ok) throw new Error("Failed to get nonce");
  return response.json();
}

export async function verifySignature(message: string, signature: string) {
  const response = await robotClient.auth.siwe.verify.$post({
    json: { message, signature },
  });
  if (!response.ok) throw new Error("Failed to verify signature");
  return response.json();
}
