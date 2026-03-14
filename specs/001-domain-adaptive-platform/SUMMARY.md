# ✅ SPECIFICATION & CONSTITUTION UPDATED - READY FOR PLANNING

**Date**: 2026-03-14
**Branch**: `001-domain-adaptive-platform`
**Status**: ✅ Specification Complete with Dynamic Role System

---

## 🎯 What Changed Based on Your Requirements

### Your Original Vision
Multi-tenant agentic SaaS supporting **ALL professions** (lawyers, teachers, doctors, engineers, account officers, students, research scholars, etc.) with **admin ability to dynamically add new roles**.

### What We Updated

#### 1. **Constitution v1.1.0 → v1.2.0** ✅
- **Principle III**: Expanded from "Legal Knowledge" to "Professional Knowledge" (all domains)
- **Principle VI**: Expanded to "Domain-Specific Knowledge Boundaries" supporting unlimited professions:
  - Legal (lawyers, magistrates)
  - Education (teachers, students)
  - Government (town officers, account officers)
  - Engineering (executive engineers)
  - Healthcare (doctors)
  - Research (research scholars)
  - **+ Any future profession admin adds**

#### 2. **Specification - Major Enhancements** ✅

**Added User Stories**:
- **User Story 2 (P2)**: Admin Creates New Professional Role - Core dynamic role creation workflow
- **User Story 4 (P2)**: User Interacts via Chat Interface - Gemini-like chat experience
- **User Story 5 (P2)**: Admin Manages Users and Views Analytics - User management dashboard
- **User Story 9 (P6)**: Doctor Generates Medical Report - Healthcare domain example
- **User Story 10 (P6)**: Executive Engineer Generates Project Specification - Engineering domain example

**Added Functional Requirements** (FR-030 to FR-035):
- FR-030: Admin can create new roles with custom configuration
- FR-031: Admin uploads initial documents when creating roles
- FR-032: System dynamically generates role-specific UI
- FR-033: Admin can deactivate roles
- FR-034: System validates role configurations
- FR-035: Role-specific document formatting standards

**Updated Entities**:
- **New Entity: Role** - Stores role configuration (name, category, AI persona, sidebar features, formatting rules)
- **User Profile**: Now references roles dynamically (no hardcoded role list)
- **User Roles**: Junction table for many-to-many user-role relationships
- **Document**: Now has `role_id` instead of hardcoded categories
- **All entities**: Updated to support dynamic role system

**Updated Success Criteria**:
- SC-018: Admin creates new role in 10 minutes
- SC-019: System supports 20+ roles simultaneously
- SC-020: 100% role isolation
- SC-021: Dynamic UI adapts in 1 second

---

## 📊 Database Architecture (PostgreSQL via Supabase)

### Core Tables

```sql
-- Dynamic Roles (admin-managed)
CREATE TABLE roles (
  role_id UUID PRIMARY KEY,
  role_name TEXT UNIQUE, -- 'doctor', 'engineer', 'accountant'
  display_name TEXT, -- 'Medical Doctor', 'Executive Engineer'
  category TEXT, -- 'healthcare', 'engineering', 'finance'
  description TEXT,
  ai_persona_prompt TEXT, -- Custom AI behavior per role
  sidebar_features JSONB, -- ["Feature1", "Feature2"]
  document_formatting_rules JSONB, -- {paper_size, margins, structure}
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- User-Role Mapping (many-to-many)
CREATE TABLE user_roles (
  user_id UUID REFERENCES profiles(id),
  role_id UUID REFERENCES roles(id),
  assigned_at TIMESTAMP DEFAULT NOW(),
  assigned_by UUID REFERENCES profiles(id),
  PRIMARY KEY (user_id, role_id)
);

-- User Profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  tenant_id UUID,
  active_role_id UUID REFERENCES roles(role_id),
  free_usage_remaining JSONB DEFAULT '{"queries": 50, "documents": 10}',
  account_status TEXT DEFAULT 'active' CHECK (account_status IN ('active', 'blocked')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Documents (role-gated)
CREATE TABLE documents (
  document_id UUID PRIMARY KEY,
  title TEXT,
  content TEXT,
  embedding VECTOR(1536), -- pgvector for RAG
  role_id UUID REFERENCES roles(role_id),
  metadata JSONB, -- Domain-specific attributes
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'needs_manual_review')),
  uploaded_by UUID REFERENCES profiles(id),
  reviewed_by UUID REFERENCES profiles(id),
  quality_score INTEGER CHECK (quality_score BETWEEN 0 AND 100),
  is_sample_template BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Chat Sessions
CREATE TABLE chat_sessions (
  session_id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  role_id UUID REFERENCES roles(role_id),
  messages JSONB[], -- [{role: 'user', content: '...', timestamp: '...'}]
  created_at TIMESTAMP DEFAULT NOW(),
  last_active TIMESTAMP DEFAULT NOW(),
  archived BOOLEAN DEFAULT false
);

-- Workflow States (document generation)
CREATE TABLE workflow_states (
  workflow_id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  role_id UUID REFERENCES roles(role_id),
  workflow_type TEXT, -- Generic, determined by role
  collected_fields JSONB,
  missing_fields TEXT[],
  current_node TEXT,
  status TEXT CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '24 hours'
);

-- Audit Logs
CREATE TABLE audit_logs (
  log_id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  tenant_id UUID,
  action TEXT, -- 'query', 'upload', 'approve', 'create_role', etc.
  resource_id UUID,
  timestamp TIMESTAMP DEFAULT NOW(),
  ip_address INET,
  details JSONB
);
```

### RLS Policies (Multi-Tenant Security)

```sql
-- Documents: Users can only see documents for their assigned roles
CREATE POLICY documents_select_policy ON documents
  FOR SELECT USING (
    role_id IN (
      SELECT role_id FROM user_roles WHERE user_id = auth.uid()
    )
    AND status = 'approved'
  );

-- User Roles: Users can only see their own role assignments
CREATE POLICY user_roles_select_policy ON user_roles
  FOR SELECT USING (user_id = auth.uid());

-- Roles: All active roles visible to authenticated users
CREATE POLICY roles_select_policy ON roles
  FOR SELECT USING (is_active = true);
```

---

## 🏗️ Tech Stack Confirmation

### ✅ Recommended Stack (Aligned with Constitution)

**Frontend**:
- **Next.js 14+** (App Router) for web
- **Expo** for mobile (iOS/Android)
- **Shared**: React hooks, Tailwind CSS, TypeScript strict mode

**Backend**:
- **FastAPI** (Python 3.11+) with Pydantic V2
- **LangGraph** for stateful agentic workflows
- **Gemini 1.5 Flash** or **Groq** (free tier) for LLM
- **python-docx** for Word document generation

**Database**:
- **Supabase** (PostgreSQL + pgvector + Auth + RLS)
- Free tier: 500MB DB, 2GB bandwidth/month, 50MB file storage

**Deployment**:
- **Render** (free tier: 750 hours/month) for FastAPI backend
- **Vercel** (free tier) for Next.js frontend
- **Expo EAS** for mobile builds

---

## 📋 Current Specification Summary

### 10 User Stories (Prioritized)
1. **P1**: Lawyer Generates Bail Application (legal domain example)
2. **P2**: Admin Creates New Professional Role (CORE - enables all professions)
3. **P2**: Admin Reviews User-Contributed Documents (HITL workflow)
4. **P2**: User Interacts via Chat Interface (primary UX)
5. **P2**: Admin Manages Users and Views Analytics (governance)
6. **P3**: Teacher Generates MCQ Quiz (education domain example)
7. **P4**: User Switches Roles (multi-role support)
8. **P5**: Magistrate Researches Legal Provisions (legal sub-role)
9. **P5**: Town Officer Queries Local Government Acts (government domain)
10. **P6**: Doctor Generates Medical Report (healthcare domain example)
11. **P6**: Executive Engineer Generates Project Specification (engineering domain example)

### 35 Functional Requirements
- FR-001 to FR-018: Core platform features (RAG, RLS, HITL, workflows)
- FR-019 to FR-027: Admin features (user management, analytics, chat, samples)
- FR-028 to FR-035: **Dynamic role system** (create roles, configure UI, formatting)

### 7 Key Entities
- Role, User Profile, User Roles, Document, Contribution, Workflow State, Chat Session, Audit Log

### 21 Success Criteria
- Performance: <5s RAG queries, <10s document generation
- Security: 100% role isolation, 0% hallucination rate
- Scalability: 20+ roles, 50 concurrent users
- Admin UX: Create role in 10 minutes

---

## 🚀 Next Steps

### Immediate Actions

1. **Review & Approve Specification** ✅
   - Spec file: `specs/001-domain-adaptive-platform/spec.md`
   - Constitution: `.specify/memory/constitution.md` (v1.2.0)
   - Scope analysis: `specs/001-domain-adaptive-platform/SCOPE_CHANGE_ANALYSIS.md`

2. **Run `/sp.plan`** to create technical architecture
   - Database schema design (with RLS policies)
   - API endpoint specifications (FastAPI + Pydantic models)
   - LangGraph workflow definitions
   - Next.js component architecture
   - Deployment strategy

3. **Run `/sp.tasks`** to generate implementation tasks
   - Phase 1: Core dynamic role system
   - Phase 2: Generic workflows
   - Phase 3: Full extensibility

### Questions for You

Before proceeding to planning phase:

1. **Initial Roles**: Which 3-5 roles should we seed the platform with for MVP?
   - Suggested: lawyer, teacher, doctor, engineer, accountant

2. **Free Tier Limits**: Are 10 documents/month and 50 queries/day appropriate for free users?

3. **Admin Access**: Should there be a super-admin role that can manage other admins?

4. **Mobile Priority**: Should we build web first, then mobile? Or parallel development?

5. **Document Formats**: Besides .docx, do you need PDF export or other formats?

---

## 📁 Files Updated

- ✅ `.specify/memory/constitution.md` (v1.1.0 → v1.2.0)
- ✅ `specs/001-domain-adaptive-platform/spec.md` (comprehensive update)
- ✅ `specs/001-domain-adaptive-platform/checklists/requirements.md` (validation passed)
- ✅ `specs/001-domain-adaptive-platform/SCOPE_CHANGE_ANALYSIS.md` (new)
- ✅ `history/prompts/001-domain-adaptive-platform/0001-domain-adaptive-platform-spec.spec.prompt.md` (PHR)

---

## ✅ Validation Status

**Constitution**: ✅ All principles updated for multi-profession support
**Specification**: ✅ All quality gates passed
- No implementation details
- All requirements testable
- Success criteria measurable and technology-agnostic
- Dynamic role system fully specified

**Ready for**: `/sp.plan` (technical architecture and implementation planning)

---

**Your platform is now architected to support unlimited professions through admin configuration. No code changes needed to add new roles!** 🎉
