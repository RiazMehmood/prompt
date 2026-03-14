---
id: 0001
title: Initialize Legal SaaS Constitution
stage: constitution
date: 2026-03-14
surface: agent
model: my-combo
feature: none
branch: master
user: riaz
command: /sp.constitution
labels: ["constitution", "legal-saas", "multi-tenant", "initial-setup"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
 - .specify/memory/constitution.md
tests:
 - none
---

## Prompt

```text
/sp
# PROJECT SPECIFICATION: Multi-Tenant Agentic SaaS (Legal-First Phase)

## 1. MISSION
Develop a multi-tenant Agentic RAG application.
- PRIMARY FOCUS (First Milestone): A Law/Magistrate platform for Pakistani Courts.
- ARCHITECTURE: Next.js (Web), Expo (Mobile), FastAPI (Backend), Supabase (Postgres + pgvector + Auth).
- COST TARGET: 100% Free-tier compatible (Gemini 1.5 Flash / Groq, Supabase Free, Render).

## 2. TECHNICAL ARCHITECTURE (CORE)
- **Database:** Supabase with pgvector.
    - Enable RLS (Row Level Security).
    - Table: `profiles` (id, email, role, category: 'lawyer', usage_stats).
    - Table: `documents` (id, content, metadata: {type: 'act', section: '144', court: 'Sindh High Court'}, embedding, status: 'approved').
- **Backend:** FastAPI (Python) using LangGraph for stateful AI workflows.
- **Mobile/Web:** Shared logic using Tailwind/NativeWind and a unified API.

## 3. FIRST MILESTONE: THE LAWYER SETUP (VERIFIED)
Implement the following endpoints and agentic logic specifically for Legal use-cases:

### A. The "Bail Application" Agentic Workflow:
1. **Intake Node:** AI analyzes the lawyer's request (e.g., "Draft bail for FIR 123 under 302 PPC").
2. **Missing Data Node:** AI cross-references the required fields for a standard Pakistani bail application. It MUST ask the user: "Please provide the Petitioner's Father's Name and the specific Police Station."
3. **Retrieval Node:** Query `documents` for "Bail Application Samples" and "Relevant PPC/CrPC Sections."
4. **Generation Node:** Use `python-docx` to populate a professional .docx template that matches Pakistani court formatting (Legal size paper, specific margins).

### B. The HITL (Human-In-The-Loop) Contribution:
- Allow Lawyers to upload "New Case Law" or "Drafting Samples."
- **Agent Task:** Analyze the PDF -> Extract Summary -> Flag for Admin Review.
- **Admin Dashboard:** Provide an 'Approve/Reject' toggle that moves the file into the Vector DB.

## 4. DEVELOPMENT STEPS (IMPLEMENTATION ORDER)
1. **Step 1: Database Setup.** Generate Supabase migrations for RLS-protected multi-tenant tables.
2. **Step 2: Legal RAG Engine.** Create a script to ingest a sample "Pakistan Penal Code" PDF into the vector store.
3. **Step 3: FastAPI 'Legal-Assistant' Endpoint.** Build a POST endpoint that uses LangGraph to handle the "Bail Application" flow.
4. **Step 4: Word Doc Generator.** Implement a service that converts AI JSON output into a formatted .docx file.
5. **Step 5: Next.js Lawyer Dashboard.** Build the chat interface and 'Download Word' button.

## 5. PRO-TIPS FOR CLAUDE (INSTRUCTIONS)
- **Strict Typing:** Use Pydantic models for all FastAPI inputs/outputs to ensure the Mobile app (Expo) knows exactly what data to expect.
- **Hallucination Check:** If the AI cannot find a specific Law Section in the RAG, it must say "I cannot find this in the official records" rather than making it up.
- **Pakistani Law Specifics:** Prioritize 'CrPC', 'PPC', and 'Constitution of Pakistan' as the primary context sources.
- **Shared Hooks:** Write a 'useChat' React hook that is compatible with both 'lucide-react' (Web) and 'lucide-react-native' (Mobile).
```

## Response snapshot

Created initial constitution (v1.0.0) for Legal-First Agentic SaaS platform with 7 core principles:
1. Multi-Tenant Security First (RLS mandatory)
2. Hallucination Prevention (grounded RAG responses)
3. Human-In-The-Loop for legal knowledge
4. Strict Typing (Pydantic + TypeScript)
5. Cost-Conscious Architecture (free-tier only)
6. Pakistani Legal Domain Specificity
7. Stateful Agentic Workflows (LangGraph)

Constitution includes technical architecture standards, development workflow phases, quality gates, and governance rules.

## Outcome

- ✅ Impact: Established foundational governance for multi-tenant legal SaaS with non-negotiable security and accuracy principles
- 🧪 Tests: none (constitution document)
- 📁 Files: Created .specify/memory/constitution.md (v1.0.0)
- 🔁 Next prompts: /sp.specify to create first feature spec (likely "Bail Application Workflow"), then /sp.plan for architecture
- 🧠 Reflection: Constitution emphasizes Pakistani legal domain specificity and free-tier constraints, which will guide all technical decisions

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): N/A (initial constitution)
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): Validate constitution principles during first feature spec creation
