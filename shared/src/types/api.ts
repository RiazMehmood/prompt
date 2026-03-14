"""Shared TypeScript API types matching Pydantic schemas."""

export interface User {
  user_id?: string;
  tenant_id?: string;
  email?: string;
  phone_number?: string;
  auth_method: "email" | "phone" | "google";
  google_id?: string;
  full_name: string;
  role_id: string;
  account_status: "active" | "suspended" | "deleted";
  created_at?: string;
}

export interface Role {
  role_id?: string;
  role_name: string;
  display_name: string;
  category: string;
  ai_persona_prompt: string;
  sidebar_features: string[];
  created_at?: string;
}

export interface Admin {
  admin_id?: string;
  user_id: string;
  admin_type: "root" | "domain" | "support";
  permissions: Record<string, boolean>;
  created_at?: string;
  is_active: boolean;
}

export interface Document {
  document_id?: string;
  title: string;
  content: string;
  category: string;
  role_id: string;
  status: "pending" | "approved" | "rejected";
  file_url?: string;
  metadata?: Record<string, any>;
  created_at?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  citations?: string[];
  confidence?: number;
}

export interface ChatSession {
  session_id?: string;
  user_id: string;
  role_id: string;
  messages: ChatMessage[];
  created_at?: string;
  last_active?: string;
}

export interface GeneratedDocument {
  generated_id?: string;
  user_id: string;
  document_type: string;
  content: string;
  file_url?: string;
  created_at?: string;
}

export interface ErrorResponse {
  error: string;
  message: string;
  details?: Record<string, any>;
}

export interface SuccessResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginationParams {
  page: number;
  page_size: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
