"""Custom React hooks for chat functionality."""
import { useMutation, useQuery } from "@tanstack/react-query";
import { ApiClient } from "shared/api/client";
import { authHelper } from "shared/lib/auth";

const apiClient = new ApiClient(
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  () => authHelper.getToken() as string | null
);

interface QueryParams {
  query: string;
  session_id?: string;
}

export function useChat() {
  const query = useMutation({
    mutationFn: async (params: QueryParams) => {
      return apiClient.post("/api/v1/rag/query", params);
    },
  });

  const createSession = useMutation({
    mutationFn: async () => {
      return apiClient.post("/api/v1/rag/sessions");
    },
  });

  const getSessions = useQuery({
    queryKey: ["chat-sessions"],
    queryFn: async () => {
      return apiClient.get("/api/v1/rag/sessions");
    },
  });

  const getSession = (sessionId: string) =>
    useQuery({
      queryKey: ["chat-session", sessionId],
      queryFn: async () => {
        return apiClient.get(`/api/v1/rag/sessions/${sessionId}`);
      },
      enabled: !!sessionId,
    });

  return {
    query,
    createSession,
    getSessions,
    getSession,
  };
}
