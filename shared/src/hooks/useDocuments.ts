"""Custom React hooks for documents functionality."""
import { useMutation, useQuery } from "@tanstack/react-query";
import { ApiClient } from "shared/api/client";
import { authHelper } from "shared/lib/auth";

const apiClient = new ApiClient(
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  () => authHelper.getToken() as string | null
);

interface UploadDocumentParams {
  title: string;
  content: string;
  category?: string;
}

export function useDocuments() {
  const upload = useMutation({
    mutationFn: async (params: UploadDocumentParams) => {
      return apiClient.post("/api/v1/documents/upload", params);
    },
  });

  const list = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      return apiClient.get("/api/v1/documents");
    },
  });

  const getDocument = (documentId: string) =>
    useQuery({
      queryKey: ["document", documentId],
      queryFn: async () => {
        return apiClient.get(`/api/v1/documents/${documentId}`);
      },
      enabled: !!documentId,
    });

  const listGenerated = useQuery({
    queryKey: ["generated-documents"],
    queryFn: async () => {
      return apiClient.get("/api/v1/documents/generated/list");
    },
  });

  return {
    upload,
    list,
    getDocument,
    listGenerated,
  };
}
