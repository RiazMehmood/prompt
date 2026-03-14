---
id: 0002
title: Universal Multi-Profession Spec Update
stage: spec
date: 2026-03-14
surface: agent
model: my-combo
feature: 001-domain-adaptive-platform
branch: 001-domain-adaptive-platform
user: riaz
command: /sp.specify
labels: ["spec", "dynamic-roles", "multi-profession", "scope-expansion", "architecture-redesign"]
links:
  spec: specs/001-domain-adaptive-platform/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/001-domain-adaptive-platform/spec.md
 - .specify/memory/constitution.md
 - specs/001-domain-adaptive-platform/SCOPE_CHANGE_ANALYSIS.md
 - specs/001-domain-adaptive-platform/SUMMARY.md
tests:
 - none
---

## Prompt

```text
User clarified: "this app is for all users includes, account officer, executive engineers, doctors, students, research scholars so make it accordingly and admin also have right to expand or add new role in list with its documents also, it is multi tenant so it support almost all professions"

Critical scope change from fixed roles (lawyer, teacher, officer) to universal multi-profession platform with dynamic role creation by admins.
```

## Response snapshot

**Major Architecture Redesign**: Transformed specification from fixed-role system to dynamic role system supporting unlimited professions.

**Key Changes**:

1. **Constitution v1.1.0 → v1.2.0**:
   - Principle III: "Legal Knowledge" → "Professional Knowledge" (all domains)
   - Principle VI: Expanded to support unlimited professions (legal, education, healthcare, engineering, finance, research, government, etc.)

2. **New User Stories Added**:
   - US2 (P2): Admin Creates New Professional Role - Core dynamic role creation
   - US4 (P2): User Interacts via Chat Interface - Gemini-like experience
   - US5 (P2): Admin Manages Users and Views Analytics
   - US9 (P6): Doctor Generates Medical Report - Healthcare example
   - US10 (P6): Executive Engineer Generates Project Specification - Engineering example

3. **New Functional Requirements** (FR-030 to FR-035):
   - Admin can create roles with custom name, category, AI persona, sidebar features
   - Admin uploads initial documents when creating roles
   - System dynamically generates role-specific UI
   - Admin can deactivate roles
   - Role-specific document formatting standards

4. **Database Architecture Redesign**:
   - New table: `roles` (admin-managed role configurations)
   - New table: `user_roles` (many-to-many user-role mapping)
   - Updated: `documents` now has `role_id` instead of hardcoded categories
   - Updated: All entities support dynamic role references

5. **Updated Success Criteria**:
   - SC-018: Admin creates new role in 10 minutes
   - SC-019: System supports 20+ roles simultaneously
   - SC-020: 100% role isolation
   - SC-021: Dynamic UI adapts in 1 second

**Architecture Impact**: Platform now supports unlimited professional domains through admin configuration without code changes. Each role has custom category, AI persona, sidebar features, and document formatting rules.

## Outcome

- ✅ Impact: Fundamental architecture shift from fixed roles to extensible dynamic role system, enabling platform to serve unlimited professions
- 🧪 Tests: Specification quality validation passed (all 14 items)
- 📁 Files: Updated spec.md, constitution.md (v1.2.0), created SCOPE_CHANGE_ANALYSIS.md and SUMMARY.md
- 🔁 Next prompts: /sp.plan to design database schema with RLS policies, API endpoints, LangGraph workflows, and Next.js dynamic UI components
- 🧠 Reflection: This is the correct architectural decision for a scalable multi-profession SaaS. Upfront complexity of dynamic system pays off with unlimited extensibility and zero code changes for new professions.

## Evaluation notes (flywheel)

- Failure modes observed: Initial spec had hardcoded roles (lawyer, teacher, officer) which would require code changes for each new profession
- Graders run and results (PASS/FAIL): Architecture review - PASS (dynamic role system is industry best practice for multi-tenant SaaS)
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): During /sp.plan phase, validate that role configuration JSON can express all domain-specific requirements without custom code
