"""Custom React hooks for authentication."""
import { useMutation, useQuery } from "@tanstack/react-query";
import { ApiClient } from "shared/api/client";
import { authHelper } from "shared/lib/auth";
import { useAuthStore } from "shared/stores/authStore";

const apiClient = new ApiClient(
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  () => authHelper.getToken() as string | null
);

interface SignupEmailParams {
  email: string;
  password: string;
  full_name: string;
  role_id: string;
}

interface VerifyEmailParams {
  email: string;
  code: string;
}

interface LoginParams {
  email: string;
  password: string;
}

export function useAuth() {
  const setAuth = useAuthStore((state) => state.setAuth);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const signupEmail = useMutation({
    mutationFn: async (params: SignupEmailParams) => {
      return apiClient.post("/api/v1/auth/signup/email", params);
    },
  });

  const verifyEmail = useMutation({
    mutationFn: async (params: VerifyEmailParams) => {
      return apiClient.post("/api/v1/auth/verify/email", params);
    },
    onSuccess: async (data: any) => {
      await authHelper.setToken(data.access_token);
      await authHelper.setUser(data.user);
      setAuth(data.user, data.access_token);
    },
  });

  const login = useMutation({
    mutationFn: async (params: LoginParams) => {
      return apiClient.post("/api/v1/auth/login", params);
    },
    onSuccess: async (data: any) => {
      await authHelper.setToken(data.access_token);
      await authHelper.setUser(data.user);
      setAuth(data.user, data.access_token);
    },
  });

  const logout = useMutation({
    mutationFn: async () => {
      await authHelper.clearAuth();
      clearAuth();
    },
  });

  const refreshToken = useMutation({
    mutationFn: async () => {
      return apiClient.post("/api/v1/auth/refresh");
    },
    onSuccess: async (data: any) => {
      await authHelper.setToken(data.access_token);
      await authHelper.setUser(data.user);
      setAuth(data.user, data.access_token);
    },
  });

  return {
    signupEmail,
    verifyEmail,
    login,
    logout,
    refreshToken,
  };
}
