# Development Checkpoints: Domain-Adaptive Multi-Tenant Agentic Platform

**Feature Branch**: `001-domain-adaptive-platform`
**Created**: 2026-03-14
**Strategy**: Progressive milestones from Free MVP → Investor Pilot → Full Scale

---

## Overview

This document defines 3 major checkpoints for progressive development, each with clear deliverables, cost structure, and admin system evolution.

**Philosophy**: Start free, prove concept, secure funding, scale profitably.

---

## Checkpoint 1: Free MVP (Weeks 1-6) 🎯

### Goal
Working demo for investors - **lawyers domain only**, web + mobile demo, no app store deployment

### Target Audience
- Investors (show working product)
- 10-20 test users (Pakistani lawyers)

### Stack (All Free - $0/month)

| Component | Service | Free Tier Limits |
|-----------|---------|------------------|
| Backend | Vercel Serverless Functions | 100GB bandwidth, 100 hours compute/month |
| Database | Supabase Free | 500MB PostgreSQL + pgvector, 2GB bandwidth |
| Cache | Upstash Redis Free | 10,000 commands/day |
| File Storage | Supabase Storage Free | 1GB storage |
| AI | Gemini 1.5 Flash Free | 15 RPM, 1M tokens/day |
| Frontend Web | Vercel Free | Unlimited deployments |
| Mobile | Expo Go | Development builds only (no app stores) |
| Payments | Stripe Test Mode | No real transactions |

### Features (MVP Scope)

**User Features**:
- ✅ US0: Authentication (email/password, phone OTP, Google OAuth)
- ✅ US1: RAG + Document Generation (lawyers only - bail applications, case analysis)
- ✅ US10: Chat Interface (conversation history, context awareness)
- ✅ Subscription UI (test mode - no real payments, just UI flow)

**Admin Features**:
- ✅ US3: Role Management (Root Admin can create/edit lawyer role)
- ✅ US5: HITL Document Approval (Root Admin approves user-uploaded documents)
- ✅ Basic admin dashboard (users list, documents pending, analytics)

### Admin System (Checkpoint 1)

**Single Root Admin** (hardcoded during setup):
- Full system access
- Can create/edit roles (lawyer role only for MVP)
- Can approve/reject documents
- Can view all users
- Can block/unblock users
- **No sub-admins yet** (added in Checkpoint 2)

**Admin Credentials**:
- Email: `admin@yourplatform.com` (set during setup)
- Password: Generated during setup
- Admin type: `root`

### Limitations (Acceptable for Demo)

- **Single domain**: Lawyers only (no doctors, teachers, etc.)
- **Concurrent users**: 10-20 max (free tier limits)
- **Documents**: 100 total in vector DB (500MB limit)
- **Mobile**: Expo Go only (scan QR code, no app stores)
- **Payments**: Test mode only (no real revenue)
- **AI queries**: 15 requests/minute (Gemini free tier)
- **No auto-scaling**: Single serverless instance

### Deliverables

**Web Application**:
- URL: `yourplatform.vercel.app` (or custom domain if purchased)
- Responsive design (works on mobile browsers)
- Full authentication flow
- Chat interface with RAG
- Document generation (.docx downloads)
- Subscription UI (test mode)

**Mobile Application**:
- Expo Go QR code for iOS/Android testing
- Same features as web (shared backend API)
- Biometric authentication (Face ID/Touch ID/Fingerprint)
- No app store deployment yet

**Admin Dashboard**:
- URL: `yourplatform.vercel.app/admin`
- User management (view, block, unblock)
- Document approval queue
- Role management (lawyer role)
- Basic analytics (user count, document count)

**Demo Materials**:
- Demo video (3-5 minutes showing full flow)
- Test accounts (5-10 lawyer accounts with sample data)
- 50-100 legal documents in vector DB (PPC, CrPC, case law)

### Success Criteria

- [ ] User can sign up with email/phone/Google
- [ ] User can ask legal questions and get RAG responses with citations
- [ ] User can generate bail application document (.docx)
- [ ] Admin can approve user-uploaded documents
- [ ] Mobile app works via Expo Go
- [ ] Demo video completed
- [ ] Ready to show investors

### Cost: $0/month

### Timeline: 6 weeks

**Week 1-2**: Setup + Foundational
- Project structure (backend, frontend, mobile)
- Database schema (users, roles, documents, subscriptions)
- Authentication (email, phone, Google OAuth)
- RLS policies

**Week 3-4**: Core Features
- RAG system (embeddings, retrieval, caching)
- Chat interface (web + mobile)
- Document generation workflow (LangGraph)
- Lawyer-specific features (bail application, case analysis)

**Week 5**: Admin Features
- Admin dashboard
- Role management
- Document approval (HITL)
- User management

**Week 6**: Testing + Demo Prep
- End-to-end testing
- Demo video recording
- Test data seeding
- Investor pitch deck

---

## Checkpoint 2: Investor Pilot (Months 2-7) 💰

### Goal
Production-ready, 2-3 domains, app stores, real revenue, **multi-admin system**

### Target Audience
- 100-500 real paying users
- 2-3 professional domains (lawyers, doctors, teachers)
- Investors (show traction and revenue)

### Stack (Paid - $500-800/month)

| Component | Service | Cost | Limits |
|-----------|---------|------|--------|
| Backend | Railway Starter OR Render | $20-25/month | 8GB RAM, 100GB bandwidth |
| Database | Supabase Pro | $25/month | 8GB DB, 50GB bandwidth, daily backups |
| Cache | Upstash Redis Pay-as-you-go | $10/month | 1M commands/month |
| File Storage | Supabase Pro (included) | $0 | 100GB storage |
| AI (Primary) | Gemini 1.5 Pro | $50-100/month | Pay per token, higher rate limits |
| AI (Backup) | OpenAI GPT-4o | $50-100/month | Automatic failover |
| Frontend Web | Vercel Free | $0 | Still works for web app |
| Mobile Builds | Expo EAS | $29/month | Unlimited builds, OTA updates |
| Apple Developer | Apple | $99/year ($8.25/month) | iOS app store |
| Google Play | Google | $25 one-time ($2/month) | Android app store |
| Email | SendGrid OR Resend | $20/month | 50k emails/month |
| SMS (OTP) | Twilio | $50/month | Pakistani SMS delivery |
| Payment Gateway | JazzCash/EasyPaisa API | $50-100/month | API access fees |
| Monitoring | Sentry Free + Uptime | $0 | Basic error tracking |

**Total**: $500-800/month

### Features (Pilot Scope)

**All Checkpoint 1 features PLUS**:

**User Features**:
- ✅ US2: Real Payments (Stripe, JazzCash, EasyPaisa)
- ✅ US8: Subscription Lifecycle (30d/7d warnings, expiry, renewal, data preservation)
- ✅ US4: Exam Prep Add-On (doctors only - MCQs, timed tests, performance analytics)
- ✅ 2-3 domains (lawyers, doctors, teachers)
- ✅ iOS + Android apps in App Store and Play Store
- ✅ Push notifications (subscription expiry, document ready)
- ✅ Email notifications (payment confirmations, warnings)

**Admin Features**:
- ✅ US7: Admin Pricing Management (adjust pricing per role, configure free trials)
- ✅ US11: Admin User Management (view, block, unblock, view analytics)
- ✅ **Multi-Admin System** (Root, Domain, Payment, Security admins)
- ✅ Admin activity logs (audit trail for all admin actions)
- ✅ Revenue analytics dashboard

### Admin System (Checkpoint 2)

**Admin Hierarchy**:

```
Root Admin (1-2 people)
├── Domain Admin: Doctors (1 person)
├── Domain Admin: Lawyers (1 person)
├── Domain Admin: Teachers (1 person)
├── Payment Admin (1 person)
└── Security Admin (1 person)
```

**Root Admin** (Super Admin):
- Full system access (all domains, all features)
- Create/delete all admin types
- Modify admin permissions
- System configuration (RLS, rate limits, AI providers)
- View all analytics (users, revenue, security)
- **Cannot be deleted** (only deactivated by another Root Admin)

**Domain Admin** (per domain):
- **Doctor Admin**: Manages doctor users, doctor documents, doctor roles
- **Lawyer Admin**: Manages lawyer users, lawyer documents, lawyer roles
- **Teacher Admin**: Manages teacher users, teacher documents, teacher roles
- **Permissions**:
  - ✅ View users in their domain
  - ✅ Block/unblock users in their domain
  - ✅ Approve/reject documents in their domain
  - ✅ Create/edit roles in their domain
  - ✅ View analytics for their domain
  - ❌ Cannot access other domains
  - ❌ Cannot manage payments
  - ❌ Cannot create admins
  - ❌ Cannot configure system settings

**Payment Admin**:
- Manages subscriptions, transactions, refunds
- Adjusts pricing (with Root approval workflow)
- Views revenue analytics (all domains)
- Processes refunds
- **Permissions**:
  - ✅ View all subscriptions
  - ✅ View all payment transactions
  - ✅ Process refunds
  - ✅ Adjust pricing (requires Root approval)
  - ✅ View revenue analytics
  - ❌ Cannot access user content or documents
  - ❌ Cannot manage users
  - ❌ Cannot create admins

**Security Admin**:
- Views audit logs (all domains)
- Blocks/unblocks users (security threats)
- Monitors suspicious activity
- Configures security policies (RLS, rate limits)
- **Permissions**:
  - ✅ View audit logs (all domains)
  - ✅ Block/unblock users (all domains, security reasons only)
  - ✅ View security analytics (failed logins, suspicious activity)
  - ✅ Configure rate limits
  - ✅ View RLS policy status
  - ❌ Cannot access payments
  - ❌ Cannot approve documents
  - ❌ Cannot create admins

### New Database Models

**Admin Table** (`backend/src/models/admin.py`):
```sql
CREATE TABLE admins (
    admin_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id),
    admin_type VARCHAR(20) NOT NULL CHECK (admin_type IN ('root', 'domain', 'payment', 'security', 'content', 'support')),
    domain_scope VARCHAR(50), -- 'doctors', 'lawyers', 'teachers', or NULL for all
    permissions JSONB NOT NULL DEFAULT '{}',
    created_by UUID REFERENCES admins(admin_id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_login TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE(user_id) -- One user can only be one admin type
);

CREATE INDEX idx_admins_type ON admins(admin_type);
CREATE INDEX idx_admins_domain ON admins(domain_scope) WHERE domain_scope IS NOT NULL;
CREATE INDEX idx_admins_active ON admins(is_active) WHERE is_active = TRUE;
```

**Admin Activity Log Table** (`backend/src/models/admin.py`):
```sql
CREATE TABLE admin_activity_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES admins(admin_id),
    action VARCHAR(100) NOT NULL, -- 'create_admin', 'block_user', 'approve_document', 'adjust_pricing', etc.
    resource_type VARCHAR(50), -- 'user', 'document', 'subscription', 'admin', etc.
    resource_id UUID,
    details JSONB, -- Additional context (old_value, new_value, reason, etc.)
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_logs_admin ON admin_activity_logs(admin_id);
CREATE INDEX idx_admin_logs_action ON admin_activity_logs(action);
CREATE INDEX idx_admin_logs_timestamp ON admin_activity_logs(timestamp DESC);
```

### New Admin Features

**Admin Management Page** (`/admin/admins`):
- List all admins (type, domain, status, last login)
- Create new admin (Root only)
  - Select admin type (domain, payment, security)
  - Assign domain scope (for domain admins)
  - Set permissions (granular checkboxes)
- Edit admin permissions (Root only)
- Deactivate admin (Root only)
- View admin activity logs (Root only)

**Domain-Scoped Dashboard** (for Domain Admins):
- Only see users/documents/analytics for their domain
- Cannot switch domains (enforced at API level)
- Limited navigation (no payments, no system config, no admin management)
- Dashboard shows: "You are managing: Doctors Domain"

**Payment Dashboard** (`/admin/payments`):
- Revenue analytics (daily, weekly, monthly)
- Transaction history (all domains)
- Refund management (process refunds with reason)
- Pricing editor (requires Root approval)
- Subscription reports (active, expired, cancelled)
- Failed payment tracking (retry status)

**Security Dashboard** (`/admin/security`):
- Audit log viewer (all domains, filterable by action/admin/date)
- Suspicious activity alerts (multiple failed logins, unusual access patterns)
- User blocking interface (block with reason, auto-unblock after X days)
- RLS policy status (verify all tables have RLS enabled)
- Rate limit configuration (per-user, per-IP, per-endpoint)
- Security metrics (blocked users, failed logins, API abuse attempts)

### Deliverables

**Production Applications**:
- Web app: Custom domain (e.g., `app.yourplatform.com`)
- iOS app: Live in App Store
- Android app: Live in Play Store
- 2-3 domains operational (lawyers, doctors, teachers)

**Real Users**:
- 100-500 paying users
- $500-2,000/month revenue
- 15-20% churn rate (industry standard)
- 80%+ user satisfaction (surveys)

**Admin System**:
- 5-10 admins operational:
  - 1-2 Root Admins
  - 3 Domain Admins (1 per domain)
  - 1 Payment Admin
  - 1 Security Admin
- Admin activity logs tracking all actions
- Admin onboarding documentation

**Business Metrics**:
- Revenue: $500-2,000/month
- Cost: $500-800/month
- Profit: Break-even to +$1,200/month
- User acquisition cost: <$10/user
- Lifetime value: $50-100/user

### Success Criteria

- [ ] 100+ paying users across 2-3 domains
- [ ] iOS + Android apps live in stores
- [ ] Real revenue ($500+/month)
- [ ] Multi-admin system operational (5+ admins)
- [ ] Payment processing working (Stripe, JazzCash, EasyPaisa)
- [ ] Subscription lifecycle working (warnings, expiry, renewal)
- [ ] Admin activity logs tracking all actions
- [ ] Ready for investor update and funding ask

### Cost: $500-800/month

### Investment Required: $3,000-4,800 (6 months × $500-800)

### Timeline: 6 months (Months 2-7)

**Month 2**: Payments + Subscription Lifecycle
- US2: Real payment integration (Stripe, JazzCash, EasyPaisa)
- US8: Subscription warnings, expiry, renewal
- Payment webhooks
- Email notifications

**Month 3**: Multi-Admin System
- Admin hierarchy (Root, Domain, Payment, Security)
- Admin management UI
- Admin activity logs
- Permission enforcement at API level
- US7: Pricing management
- US11: User management

**Month 4**: Second Domain (Doctors)
- Add doctor role
- Medical-specific features (US9: Medical reports)
- US4: Exam prep add-on (MCQs, timed tests)
- Domain Admin for doctors

**Month 5**: Third Domain (Teachers) + Mobile Apps
- Add teacher role
- Education-specific features (US6: Multi-document generation)
- Mobile app builds (Expo EAS)
- App store submissions (iOS + Android)
- Domain Admin for teachers

**Month 6**: User Acquisition + Testing
- Marketing (social media, ads)
- User onboarding improvements
- Bug fixes
- Performance optimization
- Collect user feedback

**Month 7**: Investor Update
- Prepare metrics report (users, revenue, churn)
- Demo new features (multi-domain, mobile apps, admin system)
- Funding ask: $20,000-50,000 for full-scale deployment

---

## Checkpoint 3: Full Scale (Months 8-18) 🚀

### Goal
5+ domains, 1000+ users, profitable, enterprise features, **advanced admin system**

### Target Audience
- 1,000+ paying users
- 5+ professional domains
- Enterprise clients (law firms, hospitals, schools)

### Stack (Production - $1,500-2,500/month)

| Component | Service | Cost | Limits |
|-----------|---------|------|--------|
| Backend | DigitalOcean Kubernetes | $119/month (base) + $50-100/month (nodes) | Auto-scaling, 99.9% SLA |
| Database | DigitalOcean Managed PostgreSQL | $60/month | 4GB RAM, 80GB storage, automated backups |
| Cache | DigitalOcean Managed Redis | $15/month | 1GB RAM, high availability |
| File Storage | DigitalOcean Spaces | $5/month + $0.01/GB | 250GB included, CDN |
| CDN | Cloudflare Free OR DigitalOcean | $0-1/month | Global edge caching |
| AI (Primary) | Gemini 1.5 Pro | $200-400/month | High volume, priority support |
| AI (Backup) | OpenAI GPT-4o | $200-400/month | Automatic failover |
| Frontend Web | Vercel Free | $0 | Still works |
| Mobile | Expo EAS Pro | $99/month | Priority builds, OTA updates, analytics |
| Email | Resend Pro | $80/month | 500k emails/month |
| SMS | Twilio | $100/month | High volume OTP |
| Payment Gateway | JazzCash/EasyPaisa | $200/month | Enterprise tier |
| Monitoring | Sentry Team + Datadog | $41/month | Advanced error tracking, APM |
| Support | Intercom Starter | $74/month | Live chat, ticketing |

**Total**: $1,500-2,500/month

### Features (Full Scale)

**All Checkpoint 2 features PLUS**:

**User Features**:
- ✅ US6: Multi-Document Generation (teachers - MCQs, worksheets, planners, rubrics)
- ✅ US9: Medical Reports (doctors - PMC-compliant reports)
- ✅ US13: Magistrate Legal Research (legal domain expansion)
- ✅ US14: Town Officer Policy Query (government domain)
- ✅ US15: Engineer Project Delay (engineering domain)
- ✅ US16: OCR Upload (teachers - scanned textbooks with vision AI)
- ✅ 5+ domains (lawyers, doctors, teachers, engineers, officers, magistrates)
- ✅ Enterprise features (SSO, white-label, API access)
- ✅ Advanced analytics (user behavior, feature usage, retention)

**Admin Features**:
- ✅ **Advanced Admin System** (Content Admin, Support Admin)
- ✅ Admin session management (force logout, concurrent session limits)
- ✅ Admin permissions audit (track all permission changes)
- ✅ Admin 2FA (mandatory for Root and Security admins)
- ✅ Admin IP whitelisting (restrict admin access to specific IPs)
- ✅ Bulk operations (bulk user import, bulk document approval)
- ✅ Advanced reporting (custom reports, scheduled exports)

### Admin System (Checkpoint 3)

**All Checkpoint 2 admins PLUS**:

**Content Admin** (1-2 people):
- Approves documents across ALL domains
- Manages HITL review queue (prioritize by quality score)
- Views document quality metrics
- Flags low-quality documents for rejection
- **Permissions**:
  - ✅ Approve/reject documents (all domains)
  - ✅ View document quality scores
  - ✅ View document analytics (approval rate, rejection reasons)
  - ✅ Bulk approve/reject (with filters)
  - ❌ Cannot access user data
  - ❌ Cannot manage payments
  - ❌ Cannot create admins

**Support Admin** (2-3 people):
- Views user support tickets
- Read-only access to user data (for troubleshooting)
- Can escalate to Domain Admin or Root Admin
- Responds to user queries
- **Permissions**:
  - ✅ View support tickets (all domains)
  - ✅ View user data (read-only, for troubleshooting)
  - ✅ View chat history (read-only, for support)
  - ✅ View subscription status (read-only)
  - ✅ Escalate to Domain Admin or Root Admin
  - ❌ Cannot modify user data
  - ❌ Cannot access payments
  - ❌ Cannot create admins

**Admin Hierarchy (Full Scale)**:

```
Root Admin (1-2 people)
├── Domain Admin: Doctors (1 person)
├── Domain Admin: Lawyers (1 person)
├── Domain Admin: Teachers (1 person)
├── Domain Admin: Engineers (1 person)
├── Domain Admin: Officers (1 person)
├── Domain Admin: Magistrates (1 person)
├── Payment Admin (1 person)
├── Security Admin (1 person)
├── Content Admin (1-2 people)
└── Support Admin (2-3 people)
```

**Total Admins**: 12-15 people

### Advanced Admin Features

**Admin 2FA** (Two-Factor Authentication):
- Mandatory for Root and Security admins
- Optional for other admin types
- TOTP-based (Google Authenticator, Authy)
- Backup codes for recovery

**Admin Session Management**:
- Force logout (Root can force logout any admin)
- Concurrent session limits (1 session per admin)
- Session timeout (30 minutes of inactivity)
- Session history (view all past sessions with IP, device, location)

**Admin Permissions Audit**:
- Track all permission changes (who changed what, when)
- Approval workflow for sensitive permission changes
- Rollback permissions (revert to previous state)
- Permission change notifications (email to Root Admin)

**Admin IP Whitelisting**:
- Restrict admin access to specific IPs (office, VPN)
- Configurable per admin type
- Bypass for Root Admin (with 2FA)
- IP change notifications (email alert)

**Bulk Operations**:
- Bulk user import (CSV upload)
- Bulk document approval (select multiple, approve all)
- Bulk user blocking (security threats)
- Bulk pricing updates (apply discount to all users in a domain)

**Advanced Reporting**:
- Custom reports (select metrics, date range, filters)
- Scheduled exports (daily/weekly/monthly CSV/PDF)
- Revenue reports (by domain, by tier, by payment method)
- User retention reports (cohort analysis)
- Document approval reports (approval rate, rejection reasons)

### Deliverables

**Production Applications**:
- Web app: Custom domain with CDN
- iOS app: Live in App Store with 4.5+ rating
- Android app: Live in Play Store with 4.5+ rating
- 5+ domains operational
- Enterprise features (SSO, white-label, API access)

**Real Users**:
- 1,000+ paying users
- $5,000-10,000/month revenue
- 10-15% churn rate (improved from Checkpoint 2)
- 85%+ user satisfaction
- 50+ enterprise clients

**Admin System**:
- 12-15 admins operational
- Admin 2FA enabled
- Admin activity logs with audit trail
- Admin permissions audit
- Admin IP whitelisting
- Bulk operations available

**Business Metrics**:
- Revenue: $5,000-10,000/month
- Cost: $1,500-2,500/month
- Profit: $2,500-7,500/month (50-75% margin)
- User acquisition cost: <$5/user (improved)
- Lifetime value: $100-200/user (improved)
- Payback period: 1-2 months

### Success Criteria

- [ ] 1,000+ paying users across 5+ domains
- [ ] $5,000+/month revenue
- [ ] 50-75% profit margin
- [ ] Advanced admin system operational (12-15 admins)
- [ ] Enterprise features live (SSO, white-label, API)
- [ ] 4.5+ rating on app stores
- [ ] 85%+ user satisfaction
- [ ] Ready for Series A funding or profitability

### Cost: $1,500-2,500/month

### Investment Required: $18,000-30,000/year

### Timeline: 12 months (Months 8-18)

**Month 8-9**: Additional Domains
- Add engineers domain (US15)
- Add officers domain (US14)
- Add magistrates domain (US13)
- Domain Admins for each

**Month 10-11**: Advanced Admin System
- Content Admin role
- Support Admin role
- Admin 2FA
- Admin session management
- Admin permissions audit
- Admin IP whitelisting

**Month 12-13**: Enterprise Features
- SSO integration (Google Workspace, Microsoft 365)
- White-label (custom branding per enterprise client)
- API access (REST API for integrations)
- Bulk operations

**Month 14-15**: Advanced Features
- US6: Multi-document generation (teachers)
- US16: OCR upload (vision AI)
- Advanced analytics
- Custom reporting

**Month 16-17**: Optimization
- Performance optimization (query caching, CDN)
- Cost optimization (AI model routing, batch processing)
- User retention improvements
- Churn reduction strategies

**Month 18**: Scale Preparation
- Infrastructure audit
- Security audit
- Compliance (GDPR, data protection)
- Series A pitch deck

---

## Cost Summary

| Checkpoint | Duration | Monthly Cost | Total Investment | Revenue | Profit |
|------------|----------|--------------|------------------|---------|--------|
| **Checkpoint 1: Free MVP** | 6 weeks | $0 | $0 | $0 | $0 |
| **Checkpoint 2: Investor Pilot** | 6 months | $500-800 | $3,000-4,800 | $500-2,000/mo | Break-even to +$1,200/mo |
| **Checkpoint 3: Full Scale** | 12 months | $1,500-2,500 | $18,000-30,000 | $5,000-10,000/mo | +$2,500-7,500/mo |

**Total Investment (18 months)**: $21,000-34,800

**Expected Revenue (Month 18)**: $5,000-10,000/month

**Expected Profit (Month 18)**: $2,500-7,500/month (50-75% margin)

**Payback Period**: 12-18 months

---

## Admin Permission Matrix (Full Scale)

| Permission | Root | Domain | Payment | Security | Content | Support |
|------------|------|--------|---------|----------|---------|---------|
| Create/Delete Admins | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Modify Admin Permissions | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage All Domains | ✅ | ❌ (own only) | ❌ | ✅ (read-only) | ✅ | ✅ (read-only) |
| Create/Edit Roles | ✅ | ✅ (own domain) | ❌ | ❌ | ❌ | ❌ |
| Manage Users | ✅ | ✅ (own domain) | ❌ | ✅ (block/unblock) | ❌ | ✅ (read-only) |
| Approve Documents | ✅ | ✅ (own domain) | ❌ | ❌ | ✅ (all domains) | ❌ |
| Manage Subscriptions | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| View Payment Data | ✅ | ❌ | ✅ | ✅ (audit only) | ❌ | ❌ |
| Manage Pricing | ✅ | ❌ | ✅ (requires Root approval) | ❌ | ❌ | ❌ |
| View Audit Logs | ✅ | ✅ (own domain) | ✅ (payments) | ✅ (all) | ✅ (documents) | ✅ (support) |
| Block/Unblock Users | ✅ | ✅ (own domain) | ❌ | ✅ (all domains) | ❌ | ❌ |
| View Analytics | ✅ | ✅ (own domain) | ✅ (revenue) | ✅ (security) | ✅ (documents) | ✅ (support) |
| Configure System | ✅ | ❌ | ❌ | ✅ (security only) | ❌ | ❌ |
| Bulk Operations | ✅ | ✅ (own domain) | ✅ (pricing) | ✅ (blocking) | ✅ (approval) | ❌ |
| Force Logout Admins | ✅ | ❌ | ❌ | ✅ (security threats) | ❌ | ❌ |
| View Support Tickets | ✅ | ✅ (own domain) | ❌ | ❌ | ❌ | ✅ (all) |

---

## Next Steps

1. **Review this document** with stakeholders
2. **Update plan.md** to reflect Checkpoint 1 stack (Vercel + Supabase Free)
3. **Update tasks.md** to reflect Checkpoint 1 scope (lawyers only, no payments)
4. **Create checkpoint-specific task files**:
   - `tasks-checkpoint1.md` (MVP tasks only)
   - `tasks-checkpoint2.md` (Pilot tasks)
   - `tasks-checkpoint3.md` (Full scale tasks)
5. **Begin implementation** with Checkpoint 1

---

**Document Version**: 1.0
**Last Updated**: 2026-03-14
**Status**: Ready for Review
