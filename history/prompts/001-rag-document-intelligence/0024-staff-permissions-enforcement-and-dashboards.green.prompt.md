---
id: "0024"
title: Staff Permission Enforcement and Complete Dashboard Suite
stage: green
date: 2026-03-23
surface: agent
model: claude-sonnet-4-6
feature: 001-rag-document-intelligence
branch: 001-rag-document-intelligence
user: riaz
command: resume
labels: ["staff-permissions", "dashboards", "rbac", "user-portal", "staff-portal"]
links:
  spec: "null"
  ticket: "null"
  adr: "null"
  pr: "null"
files:
  - backend/src/api/dependencies.py
  - backend/src/api/v1/documents.py
  - backend/src/api/v1/analytics.py
  - backend/src/api/v1/admin.py
  - backend/src/api/v1/staff.py
  - frontend/src/app/user/documents/page.tsx
  - frontend/src/app/user/chat/page.tsx
  - frontend/src/app/user/billing/page.tsx
  - frontend/src/app/staff/templates/page.tsx
  - frontend/src/app/staff/institutes/page.tsx
  - frontend/src/app/staff/subscriptions/page.tsx
tests:
  - manual build check (npx next build --no-lint — 36 static pages compiled)
  - python3 import checks for all modified backend modules
---

## Prompt

(Resumed from previous session — continuing staff permission enforcement, user portal sub-pages, and remaining staff pages)

## Response

### Staff Permission Enforcement (Backend)

Added `require_permission(*permissions)` factory to `dependencies.py`:
- Accepts root_admin and domain_admin automatically
- For staff: queries `staff_permissions` table with `in_()` filter on any of the listed permissions
- Wired type aliases: `ApproveDocumentsUser`, `ViewAnalyticsUser`, `ManageUsersUser` (accepts manage_all_users OR manage_domain_users), `ManageTemplatesUser`, `ManagePaymentsUser`, `ManageInstitutesUser`, `ManageSubsUser`

Endpoint updates:
- `documents.py`: approve/reject now use `ApproveDocumentsUser` (staff with approve_documents can act)
- `analytics.py`: all 5 analytics routes now use `ViewAnalyticsUser`
- `admin.py`: list/get/update user endpoints use `ManageUsersUser`; domain-scoped staff are automatically restricted to their domain_id
- `staff.py`: GET /{id}/permissions allows staff to fetch their own permissions (self-access only)

### User Portal (Frontend)

- `/user/documents`: filterable document list with status tabs (all/pending/approved/indexed/rejected), file size formatter, status color badges
- `/user/chat`: full AI chat UI calling `/rag/query`; Enter-to-send, animated typing indicator, auto-scroll to bottom
- `/user/billing`: current plan card with live usage counters, plan comparison grid with upgrade buttons, fallback static tiers if API returns nothing

### Staff Portal (Frontend)

- `/staff/templates`: re-export of domain-admin templates page
- `/staff/institutes`: institute list with seat quota progress bars (red/amber/green thresholds)
- `/staff/subscriptions`: subscription activity list using analytics API
- All wired into staff layout PERM_NAV map

### Commits

- c2e3e84: feat: role-based dashboards, landing page, signup, and collapsible admin sidebar
- 3fca1ef: feat: staff permission enforcement across backend endpoints
- 057d1be: feat: complete user portal sub-pages and all missing staff pages
