# Data Model: Prompt – Multi-Tenant AI-Powered RAG-Based Document Intelligence Platform

## Core Entities

### User
- **Fields**:
  - `id`: UUID (primary key)
  - `email`: String (unique, nullable)
  - `phone`: String (unique, nullable)
  - `password_hash`: String
  - `verification_code`: String (nullable)
  - `verification_expires`: DateTime (nullable)
  - `domain_id`: UUID (foreign key to Domain, immutable after creation)
  - `subscription_tier`: Enum ('basic', 'pro', 'premium', 'institutional')
  - `subscription_start_date`: DateTime (nullable)
  - `subscription_expiry_date`: DateTime (nullable)
  - `document_generation_count`: Integer (daily counter)
  - `upload_count`: Integer (daily counter)
  - `role`: Enum ('user', 'domain_admin', 'root_admin')
  - `created_at`: DateTime
  - `updated_at`: DateTime
  - `last_login_at`: DateTime (nullable)
- **Validation**: Email or phone required, domain_id immutable, subscription dates match tier
- **Relationships**: Belongs to Domain, Has many GeneratedDocuments, Has many TokenUsages
- **RLS Policy**: Users can only access their own record (except root_admin can view all)

### Domain
- **Fields**:
  - `id`: UUID (primary key)
  - `name`: String (unique)
  - `description`: Text (nullable)
  - `icon_url`: String (nullable)
  - `status`: Enum ('active', 'inactive')
  - `configuration`: JSONB (domain-specific settings)
  - `knowledge_base_namespace`: String (unique, for vector db isolation)
  - `created_at`: DateTime
  - `updated_at`: DateTime
- **Validation**: Name unique, namespace unique for vector isolation
- **Relationships**: Has many Users, Has many Templates, Has many Documents, Has many Embeddings
- **RLS Policy**: All users can read active domains, only domain_admin/root_admin can modify

### Template
- **Fields**:
  - `id`: UUID (primary key)
  - `name`: String
  - `domain_id`: UUID (foreign key to Domain)
  - `description`: Text (nullable)
  - `content`: Text (template with {{slots}})
  - `slot_definitions`: JSONB (array of slot objects with name, type, required, data_source)
  - `formatting_rules`: JSONB (paper size, margins, fonts, etc.)
  - `version`: String
  - `is_active`: Boolean
  - `created_by`: UUID (foreign key to User)
  - `created_at`: DateTime
  - `updated_at`: DateTime
- **Validation**: Belongs to domain, content contains all slot definitions
- **Relationships**: Belongs to Domain, Belongs to User (creator), Has many GeneratedDocuments
- **RLS Policy**: Domain isolation - users can only access templates from their domain

### Document (Knowledge Base)
- **Fields**:
  - `id`: UUID (primary key)
  - `filename`: String
  - `file_path`: String (storage path)
  - `file_size_bytes`: Integer
  - `mime_type`: String
  - `domain_id`: UUID (foreign key to Domain)
  - `document_type`: Enum ('act', 'case_law', 'sample', 'textbook', 'protocol', 'standard')
  - `metadata`: JSONB (chapters, sections, jurisdiction, date, etc.)
  - `status`: Enum ('pending', 'approved', 'rejected')
  - `approval_notes`: Text (nullable)
  - `uploaded_by`: UUID (foreign key to User)
  - `approved_by`: UUID (foreign key to User, nullable)
  - `approved_at`: DateTime (nullable)
  - `ocr_processed`: Boolean (default false — true after OCR pipeline runs)
  - `ocr_confidence_avg`: Float (nullable — average OCR confidence across all image pages)
  - `ocr_flagged_pages`: JSONB (nullable — array of {page_num, confidence, reason} for low-confidence pages)
  - `detected_language`: Enum ('english', 'urdu', 'sindhi', 'mixed', nullable)
  - `created_at`: DateTime
  - `updated_at`: DateTime
- **Validation**: Status transition follows pending → approved/rejected, only domain_admin can approve; ocr_flagged_pages blocks auto-approval if any page confidence < 70%
- **Relationships**: Belongs to Domain, Belongs to User (uploader), Has many Embeddings
- **RLS Policy**: Domain isolation, only domain_admin can approve/reject

### Embedding
- **Fields**:
  - `id`: UUID (primary key)
  - `document_id`: UUID (foreign key to Document)
  - `chunk_text`: Text
  - `chunk_index`: Integer
  - `embedding_vector`: Array of floats (768 dimensions — multilingual-e5-base)
  - `metadata`: JSONB (source document info, section, page, script_direction, etc.)
  - `domain_namespace`: String (for vector db isolation)
  - `language`: Enum ('english', 'urdu', 'sindhi', 'mixed') — detected language of chunk
  - `is_ocr_derived`: Boolean (default false — true if chunk came from OCR extraction)
  - `created_at`: DateTime
- **Validation**: Associated with approved document, vector dimensions = 768 (multilingual-e5-base)
- **Relationships**: Belongs to Document
- **RLS Policy**: Retrieved only through RAG queries with domain context

### GeneratedDocument
- **Fields**:
  - `id`: UUID (primary key)
  - `user_id`: UUID (foreign key to User)
  - `template_id`: UUID (foreign key to Template)
  - `domain_id`: UUID (foreign key to Domain)
  - `input_parameters`: JSONB (user-provided values for template slots)
  - `retrieved_sources`: JSONB (array of RAG sources with confidence scores)
  - `output_content`: Text (generated document content)
  - `output_language`: Enum ('english', 'urdu', 'sindhi') — language of generated output
  - `output_format`: Enum ('in_app', 'pdf', 'docx')
  - `validation_status`: Enum ('valid', 'invalid', 'pending')
  - `validation_errors`: JSONB (nullable, validation error details)
  - `created_at`: DateTime
- **Validation**: All required template slots populated from valid sources; output_language must be supported by the domain's configured languages
- **Relationships**: Belongs to User, Belongs to Template, Belongs to Domain
- **RLS Policy**: Users can only access their own generated documents

### Subscription
- **Fields**:
  - `id`: UUID (primary key)
  - `user_id`: UUID (foreign key to User)
  - `tier`: Enum ('basic', 'pro', 'premium', 'institutional')
  - `status`: Enum ('active', 'expired', 'cancelled')
  - `start_date`: Date
  - `expiry_date`: Date
  - `payment_reference`: String (nullable)
  - `amount_paid`: Decimal (nullable)
  - `currency`: String (default 'PKR')
  - `institution_id`: UUID (foreign key to User if institutional, nullable)
  - `created_at`: DateTime
  - `updated_at`: DateTime
- **Validation**: Dates valid, payment details match status (for MVP: status always 'active' for basic tier)
- **Relationships**: Belongs to User
- **RLS Policy**: Users can only access their own subscriptions

### PromotionalToken
- **Fields**:
  - `id`: UUID (primary key)
  - `code`: String (unique)
  - `discount_type`: Enum ('percentage', 'fixed_amount', 'trial_extension', 'document_credit')
  - `discount_value`: Decimal
  - `max_usage_count`: Integer
  - `current_usage_count`: Integer (default 0)
  - `expiry_date`: Date
  - `domain_restriction`: UUID (foreign key to Domain, nullable)
  - `tier_restriction`: Enum ('basic', 'pro', 'premium', 'institutional', nullable)
  - `created_by`: UUID (foreign key to User)
  - `created_at`: DateTime
  - `updated_at`: DateTime
- **Validation**: Code unique, usage count doesn't exceed max, not expired
- **Relationships**: Created by User, Optionally restricted to Domain
- **RLS Policy**: All users can use tokens, only root_admin can create

### TokenUsage
- **Fields**:
  - `id`: UUID (primary key)
  - `token_id`: UUID (foreign key to PromotionalToken)
  - `user_id`: UUID (foreign key to User)
  - `benefit_applied`: JSONB (what benefit was granted)
  - `redemption_date`: DateTime
- **Validation**: Token must be valid (not expired, usage < max) at redemption time
- **Relationships**: Belongs to Token, Belongs to User
- **RLS Policy**: Users can only see their own token usage

### VoiceSession *(Phase 2 – Pilot)*
- **Fields**:
  - `id`: UUID (primary key)
  - `user_id`: UUID (foreign key to User)
  - `domain_id`: UUID (foreign key to Domain)
  - `audio_file_path`: String (temporary storage; deleted after transcription)
  - `transcription_text`: Text (nullable — populated after Whisper processing)
  - `transcription_language`: Enum ('english', 'urdu', 'sindhi')
  - `transcription_confidence`: Float (nullable — Whisper confidence score)
  - `status`: Enum ('recording', 'processing', 'completed', 'failed')
  - `submitted_as_query`: Boolean (default false — true when user confirms transcription)
  - `resulting_query_id`: UUID (nullable — reference to the query generated from this voice session)
  - `created_at`: DateTime
  - `completed_at`: DateTime (nullable)
- **Validation**: Audio file deleted after transcription completes (privacy); submitted_as_query only set after user confirmation
- **Relationships**: Belongs to User, Belongs to Domain
- **RLS Policy**: Users can only access their own voice sessions; audio files never shared
- **Note**: This entity is created but no audio is retained after transcription. GDPR-compliant: audio deleted within 30 seconds of transcription completion.

### UsageLog
- **Fields**:
  - `id`: UUID (primary key)
  - `user_id`: UUID (foreign key to User)
  - `action_type`: Enum ('document_generation', 'document_upload', 'api_call', 'login', 'logout')
  - `domain_id`: UUID (foreign key to Domain)
  - `resource_id`: UUID (nullable, ID of resource acted upon)
  - `timestamp`: DateTime
  - `details`: JSONB (request/response metadata, IP, user agent)
- **Validation**: Required fields present
- **Relationships**: Belongs to User, Belongs to Domain
- **RLS Policy**: Users can see their own logs, admins can see all logs

## Database Schema Considerations

### Indexes
- **User**: Index on email, phone, domain_id
- **Domain**: Index on name, status
- **Template**: Index on domain_id, is_active
- **Document**: Index on domain_id, status, created_at
- **GeneratedDocument**: Index on user_id, domain_id, created_at
- **Embedding**: Index on document_id, domain_namespace (for vector queries)
- **UsageLog**: Index on user_id, domain_id, action_type, timestamp

### RLS Policies (PostgreSQL)
- All tables with user data have RLS enabled
- Users can only access records within their assigned domain
- Users can only access their own personal records
- Domain_admin can access all records in their domain
- Root_admin can access all records across all domains

### Audit Trail
- All sensitive operations logged in UsageLog
- Document approval/rejection tracked with user context
- Subscription changes logged for billing compliance