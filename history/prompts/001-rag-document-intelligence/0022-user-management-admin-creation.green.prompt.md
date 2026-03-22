---
id: "0022"
title: User Management and Admin Creation
stage: green
date: 2026-03-23
surface: agent
model: claude-sonnet-4-6
feature: 001-rag-document-intelligence
branch: 001-rag-document-intelligence
user: riaz
command: sp.implement
labels: ["user-management", "admin", "frontend", "backend"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - backend/src/api/v1/admin.py
  - frontend/src/app/admin/users/page.tsx
  - frontend/src/app/admin/layout.tsx
tests:
  - GET /admin/users — returns paginated user list with total count
  - POST /admin/create-admin — creates domain_admin/root_admin via supabase.auth.admin.create_user
  - PATCH /admin/users/{id} — updates role/domain/tier with scope enforcement
  - DELETE /admin/users/{id} — root_admin only hard delete
  - Frontend /admin/users — HTTP 200, page renders
---

## Prompt

if i am an root admin, then there is no option for creating other admins or another root admin, and what about institutes? and their dashboard? and i can only see number of users in analytics but i have no power to deactivate them to see their details or update them or delete them etc.

## Response snapshot

Added 5 new backend endpoints in `admin.py`:
- `GET /admin/users` — paginated list with role/domain/search filters; domain_admin scope enforced
- `GET /admin/users/{id}` — full user detail
- `PATCH /admin/users/{id}` — update role, domain, tier, deactivate
- `DELETE /admin/users/{id}` — root_admin only permanent delete
- `POST /admin/create-admin` — creates admin accounts using `supabase.auth.admin.create_user()` (bypasses FK constraint by creating auth user first, then upserts profile with admin role)

Built `/admin/users` page (Next.js) with:
- Paginated table (email, role badge, domain, tier, last login)
- Search by email, filter by role and domain
- Edit modal (change role / domain / subscription tier)
- Deactivate button (PATCH is_active=false)
- Delete with confirmation modal (root_admin only)
- "Create Admin" modal — picks role (domain_admin/root_admin), domain (required for domain_admin), email + password

Added "Users" and renamed "Domains / Institutes" links to sidebar nav.

## Outcome

- ✅ Impact: Root admin can now list, search, edit, deactivate, delete users and create domain_admin / root_admin accounts from the admin panel
- 🧪 Tests: All 5 endpoints tested live — /admin/users returns 3 users, create-admin created legal_admin@test.com as domain_admin successfully
- 📁 Files: admin.py (+5 endpoints), users/page.tsx (new), layout.tsx (nav updated)
- 🔁 Next prompts: Add domain admin dashboard (institute-specific analytics + user view); add pagination to users; consider Supabase RLS for domain-scoped visibility
- 🧠 Reflection: Supabase profiles table has FK to auth.users — direct insert fails; must use supabase.auth.admin.create_user() first, then upsert profile

## Evaluation notes (flywheel)

- Root cause of create-admin failure: `profiles.id` FK references `auth.users(id)` — inserting directly without creating auth user first violates constraint
- Fix: use `supabase.auth.admin.create_user()` which creates the row in `auth.users`, then upsert profile
