---
id: 0011
title: Checkpoint 1 tasks file creation
stage: tasks
date: 2026-03-14
surface: agent
model: my-combo
feature: 001-domain-adaptive-platform
branch: 001-domain-adaptive-platform
user: riaz
command: manual
labels: ["tasks", "checkpoint1", "mvp", "investors", "free-stack"]
links:
  spec: /specs/001-domain-adaptive-platform/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - /specs/001-domain-adaptive-platform/tasks-checkpoint1.md (created - 145 tasks for MVP)
tests:
  - null
---

## Prompt

User requested: "create tasks-checkpoint1.md"

Context: Following the 3-checkpoint strategy and full cost breakdown discussion. User wants to start Checkpoint 1 (Free MVP for investors, lawyers domain only, $0/month).

Prior context included:
- Cost breakdown discussion (PKR + USD) covering infrastructure, development, legal, CI/CD, team costs
- User asked about office, legal, CI/CD, future developer needs
- Answer: Home-based for CP2 (no office), PKR 50,000-100,000 one-time legal in CP2, GitHub Actions free for CP1/CP2, solo founder for CP2, 5-8 person remote team for CP3

## Response snapshot

Created comprehensive `tasks-checkpoint1.md` with 145 tasks scoped specifically for Checkpoint 1 Free MVP.

**Scope (Checkpoint 1 only)**:
- ✅ US0: Authentication (email/phone/Google)
- ✅ US1: RAG + Document Generation (lawyers only)
- ✅ US10: Chat Interface polish
- ✅ US3: Role Management (Root Admin only)
- ✅ US5: HITL Document Approval (Root Admin only)
- ✅ Subscription UI (test mode only, no real payments)
- ❌ Excluded: US2 (real payments), US4 (exam prep), US6-US16 (other domains)
- ❌ Excluded: App stores (Expo Go only)
- ❌ Excluded: Multi-admin system (single Root Admin only)
- ❌ Excluded: Kubernetes, DigitalOcean (Vercel + Supabase Free only)

**Stack Changes vs Full tasks.md**:
- Backend: Vercel Serverless Functions (not Docker/Kubernetes)
- Database: Supabase Free client (not Alembic migrations, not managed PostgreSQL)
- Cache: Upstash Redis Free (10,000 commands/day limit)
- AI: Gemini Flash Free (15 RPM, 1M tokens/day)
- Mobile: Expo Go only (not Expo EAS, no app stores)
- Payments: Stub endpoints only (no Stripe/JazzCash/EasyPaisa)
- Admin: Single Root Admin model only (no Domain/Payment/Security admins)
- Shared code: npm workspaces with @shared/ package (T005-T006)

**Key Architecture Decisions for Checkpoint 1**:
1. npm workspaces for shared code (hooks, stores, types, api, utils)
2. Supabase client directly (no Alembic, simpler for free tier)
3. Single Root Admin (hardcoded during setup)
4. Lawyer role only (category: "legal")
5. Vercel serverless functions (no Docker containers needed)
6. Gemini Flash free tier (15 RPM - sufficient for 10-20 test users)
7. Subscription UI = mock data only (real pricing displayed, "Coming soon" CTA)

**Task Breakdown by Phase**:
- Phase 1 (Setup): 14 tasks (Week 1, Days 1-3)
- Phase 2 (Foundational): 26 tasks (Week 1, Days 4-7)
- Phase 3 (US0 Auth): 22 tasks (Week 2, Days 8-14)
- Phase 4 (US1 RAG): 31 tasks (Week 3-4, Days 15-28)
- Phase 5 (US10 Chat): 3 tasks (Week 5, Days 29-35)
- Phase 6 (US3 Admin): 5 tasks (Week 5, Days 29-35)
- Phase 7 (US5 HITL): 5 tasks (Week 5, Days 29-35)
- Phase 8 (Subscription UI): 5 tasks (Week 6)
- Phase 9 (Testing & Demo): 15 tasks (Week 6)
- Deployment: 19 tasks (Week 6)

**Timeline**: 6 weeks (42 days)
**Cost**: PKR 0 ($0/month)
**Target users**: 10-20 test lawyers
**Deliverable**: Working MVP for investor demo

## Outcome

- ✅ Impact: Created focused 145-task MVP file for Checkpoint 1 (lawyers domain only, $0/month free stack). Tasks are immediately executable with exact file paths, phase structure, and parallel markers. Ready to begin implementation.
- 🧪 Tests: Success criteria checklist included (13 checks), test tasks in Phase 9 (15 tasks)
- 📁 Files: Created /specs/001-domain-adaptive-platform/tasks-checkpoint1.md (145 tasks)
- 🔁 Next prompts: Run `/sp.implement` pointing to tasks-checkpoint1.md to begin Checkpoint 1 implementation
- 🧠 Reflection: Key difference from full tasks.md - Supabase client (not Alembic migrations), Vercel serverless (not Docker), single Root Admin (not 6-type hierarchy), Expo Go (not EAS), Gemini Flash free (not Pro). npm workspaces pattern correctly included for shared code between web and mobile. Subscription UI is intentionally stub-only to keep Checkpoint 1 free and simple.

## Evaluation notes (flywheel)

- Failure modes observed: None - task file creation completed successfully
- Graders run and results (PASS/FAIL): PASS - all 9 phases covered, deployment checklist included, success criteria checklist included
- Prompt variant (if applicable): Direct task file creation from checkpoint strategy discussion
- Next experiment (smallest change to try): Run /sp.analyze on tasks-checkpoint1.md to verify consistency with spec.md and plan.md before implementing
