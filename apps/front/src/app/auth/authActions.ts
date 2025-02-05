import { apiClient } from "@/lib/apiClient";

type ChangePasswordSchema = {
  currentPassword: string;
  newPassword: string;
};

export const getCurrentUser = async () => {
  const response = await apiClient.auth.me.$get();
  if (response.status !== 200) {
    const text = await response.text();
    throw new Error(`Failed to fetch current user: ${text}`);
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
  const response = await apiClient.auth["change-password"].$post({
    json: props.data,
  });
  if (response.status !== 200) {
    throw new Error("Failed to change user password");
  }
  return response.json();
};

export const updateUser = async (data: { username?: string }) => {
  const response = await apiClient.auth.me.$put({
    json: data,
  });
  if (response.status !== 200) {
    throw new Error("Failed to update user");
  }
  return response.json();
};
