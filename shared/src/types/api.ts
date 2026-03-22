/**
 * Shared API types — generated from backend Pydantic schemas.
 * Used by both frontend (Next.js) and mobile (React Native).
 */

// ============================================================
// Enums
// ============================================================

export type SubscriptionTier = 'basic' | 'pro' | 'premium' | 'institutional';
export type UserRole = 'user' | 'domain_admin' | 'root_admin';
export type DomainStatus = 'active' | 'inactive';
export type DocumentType = 'act' | 'case_law' | 'sample' | 'textbook' | 'protocol' | 'standard';
export type DocumentStatus = 'pending' | 'approved' | 'rejected';
export type LanguageCode = 'english' | 'urdu' | 'sindhi' | 'mixed';
export type OutputFormat = 'in_app' | 'pdf' | 'docx';
export type ValidationStatus = 'valid' | 'invalid' | 'pending';
export type VoiceSessionStatus = 'recording' | 'processing' | 'completed' | 'failed';
export type TranscriptionLanguage = 'english' | 'urdu' | 'sindhi';

// ============================================================
// User / Auth
// ============================================================

export interface User {
  id: string;
  email?: string;
  phone?: string;
  domainId?: string;
  subscriptionTier: SubscriptionTier;
  role: UserRole;
  documentGenerationCount: number;
  uploadCount: number;
  createdAt: string;
  lastLoginAt?: string;
}

export interface RegisterRequest {
  email?: string;
  phone?: string;
  password: string;
}

export interface LoginRequest {
  email?: string;
  phone?: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  expiresIn: number;
}

export interface VerifyEmailRequest {
  email: string;
  code: string;
}

export interface VerifyPhoneRequest {
  phone: string;
  code: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

// ============================================================
// Domain
// ============================================================

export interface Domain {
  id: string;
  name: string;
  description?: string;
  iconUrl?: string;
  status: DomainStatus;
  configuration: Record<string, unknown>;
  knowledgeBaseNamespace: string;
  createdAt: string;
}

// ============================================================
// Template
// ============================================================

export interface SlotDefinition {
  name: string;
  type: 'text' | 'date' | 'number' | 'list';
  required: boolean;
  dataSource: 'user_input' | 'rag_retrieval';
}

export interface Template {
  id: string;
  name: string;
  domainId: string;
  description?: string;
  content: string;
  slotDefinitions: SlotDefinition[];
  formattingRules: Record<string, unknown>;
  version: string;
  isActive: boolean;
  createdAt: string;
}

// ============================================================
// Document (Knowledge Base)
// ============================================================

export interface OcrFlaggedPage {
  pageNum: number;
  confidence: number;
  reason: string;
}

export interface Document {
  id: string;
  filename: string;
  fileSizeBytes: number;
  mimeType: string;
  domainId: string;
  documentType: DocumentType;
  metadata: Record<string, unknown>;
  status: DocumentStatus;
  approvalNotes?: string;
  uploadedBy: string;
  ocrProcessed: boolean;
  ocrConfidenceAvg?: number;
  ocrFlaggedPages?: OcrFlaggedPage[];
  detectedLanguage?: LanguageCode;
  createdAt: string;
}

// ============================================================
// Generated Document
// ============================================================

export interface RagSource {
  sourceId: string;
  text: string;
  confidence: number;
  page?: number;
}

export interface GeneratedDocument {
  id: string;
  userId: string;
  templateId: string;
  domainId: string;
  inputParameters: Record<string, unknown>;
  retrievedSources: RagSource[];
  outputContent: string;
  outputLanguage: LanguageCode;
  outputFormat: OutputFormat;
  validationStatus: ValidationStatus;
  validationErrors?: Record<string, unknown>;
  createdAt: string;
}

// ============================================================
// Conversation (multilingual text input)
// ============================================================

export interface ConversationRequest {
  message: string;
  language: LanguageCode;
  domainId: string;
  sessionId?: string;
}

export interface ConversationResponse {
  reply: string;
  language: LanguageCode;
  sources: RagSource[];
  sessionId: string;
}

// ============================================================
// Voice (Phase 2 — Pilot)
// ============================================================

export interface VoiceTranscribeResponse {
  sessionId: string;
  transcriptionText: string;
  language: TranscriptionLanguage;
  confidence: number;
  status: VoiceSessionStatus;
}

export interface SpeechSynthesisRequest {
  text: string;
  language: TranscriptionLanguage;
  sessionId?: string;
}

// ============================================================
// Subscription
// ============================================================

export interface Subscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  status: 'active' | 'expired' | 'cancelled';
  startDate: string;
  expiryDate: string;
  currency: string;
  amountPaid?: number;
}

// ============================================================
// API Common
// ============================================================

export interface ApiError {
  code: string;
  message: string;
  requestId?: string;
  details?: unknown;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
