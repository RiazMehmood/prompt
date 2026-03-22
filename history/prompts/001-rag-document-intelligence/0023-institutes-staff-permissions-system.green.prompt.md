---
id: "0023"
title: Institutes and Staff Permissions System
stage: green
date: 2026-03-23
surface: agent
model: claude-sonnet-4-6
feature: 001-rag-document-intelligence
branch: 001-rag-document-intelligence
user: riaz
command: sp.implement
labels: ["institutes", "staff", "permissions", "rbac", "backend", "frontend"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - backend/supabase/migrations/005_institutes_staff_permissions.sql
  - backend/src/api/v1/institutes.py
  - backend/src/api/v1/staff.py
  - backend/src/api/v1/admin.py
  - backend/src/main.py
  - frontend/src/app/admin/institutes/page.tsx
  - frontend/src/app/admin/staff/page.tsx
  - frontend/src/app/admin/users/page.tsx
  - frontend/src/app/admin/layout.tsx
tests:
  - POST /institutes — creates City Law School, returns institute ID
  - GET /institutes — returns total=1
  - POST /admin/staff — creates staff account with approve_documents permission
  - POST /admin/create-user — creates regular user account
  - GET /admin/institutes, /admin/staff, /admin/users — all HTTP 200
---

## Prompt

no domains are separate and institutes are separate, lets suppose we went to a school their domain is education but institute is school from where we get users in bulk and on discount by asking principal to purchase the subscription for their school and we provide them their id password for institute so they can manage their users by them self, and one more thing is that in user management section we need option to create users also by root admin only, and admin creation by root admin must be separate to those root admin assign duties to multiple other admins, they have limited access to perform task, like if root admin creates legal admin then he assign him task to check their legal domain users their subscription and other necessary details, same for other domains, root admin can also create users admin who watches for all users, root admin also can create payment admin which see payment issues and answer their queries, root admin can also create document approval admin which approves documents from users, and so on thing all possibilities.

## Response snapshot

**DB Migration 005** (run via psql direct connection to Supabase):
- `ALTER TYPE user_role ADD VALUE 'staff'` + `'institute_admin'`
- New `institutes` table: id, name, domain_id, contact_email, contact_phone, address, subscription_plan, discount_pct (0-100), max_users, status (active/suspended/pending), notes
- `profiles.institute_id` FK to institutes
- `staff_permissions` table: staff_id, permission TEXT, domain_id (nullable) with UNIQUE(staff_id, permission, domain_id)

**Backend** — 2 new routers + updates:
- `institutes.py` (prefix `/institutes`): CRUD, list-users, create-institute-admin
- `staff.py` (prefix `/admin/staff`): list, create with permissions, add/remove permissions per staff, delete
- `admin.py` — added `POST /admin/create-user` (root_admin only, no email verification required)
- `admin.py` — `PATCH /admin/users/{id}` now also accepts `institute_id`

**8 permission scopes**: manage_all_users, manage_domain_users (requires domain_id), approve_documents, manage_payments, manage_institutes, view_analytics, manage_subscriptions, manage_templates

**Frontend** — 3 pages + sidebar update:
- `/admin/institutes` — paginated table, create/edit/delete, + Admin button per institute
- `/admin/staff` — permissions reference card, create with checkboxes, manage permissions per staff (add/remove)
- `/admin/users` — added "+ Create User" button and modal
- `layout.tsx` — grouped sidebar nav: Users & Orgs (Users, Institutes, Domains) | Admin (Staff, Tokens) | Content (Documents, Templates)

## Outcome

- ✅ Impact: Full institute + staff RBAC system. Root admin can now create bulk-subscription institutes, assign institute admins, create platform staff with scoped permissions (document approver, payments admin, domain watcher, etc.)
- 🧪 Tests: All 4 new backend endpoints tested and passing; all 3 frontend pages HTTP 200
- 📁 Files: 1 migration, 2 new router files, 3 updated backend files, 3 new frontend pages, 1 updated layout
- 🔁 Next: Build institute_admin dashboard (their users, quota, stats); wire staff permission checks into existing endpoints; add bulk user import for institutes
- 🧠 Reflection: staff_permissions uses a TEXT column (not enum) for permission types — avoids future ALTER TYPE migrations when adding new scopes

## Evaluation notes (flywheel)

- Supabase pooler (port 6543) connection failed; direct DB host `db.<ref>.supabase.co:5432` with `postgres` user (not `postgres.<ref>`) worked
- psql ran the migration cleanly — verified table structure and enum values after
