# Supabase Setup Instructions

## Step 1: Run Database Migrations

Go to your Supabase dashboard: https://supabase.com/dashboard/project/ypxflnyritmmhszqfebr

Navigate to: **SQL Editor** → **New Query**

Run the following migrations in order:

### Migration 1: Core Tables
```sql
-- File: backend/supabase/migrations/20260314_create_core_tables.sql
-- Copy and paste the entire contents of this file
```

### Migration 2: Subscriptions Table
```sql
-- File: backend/supabase/migrations/20260314_create_subscriptions_table.sql
-- Copy and paste the entire contents of this file
```

### Migration 3: Documents and Chat Tables
```sql
-- File: backend/supabase/migrations/20260314_create_documents_chat_tables.sql
-- Copy and paste the entire contents of this file
```

### Migration 4: RLS Policies
```sql
-- File: backend/supabase/migrations/20260315_create_rls_policies.sql
-- Copy and paste the entire contents of this file
```

## Step 2: Seed Initial Data

Run the seed script:
```bash
cd backend
python scripts/seed_data.py
```

This will create:
- 1 lawyer role with AI persona
- 1 root admin user (admin@example.com / admin123)
- 5 sample legal documents (PPC sections 302, 420, 489-F; CrPC sections 154, 497)

## Step 3: Verify Setup

Check that tables exist:
- users
- roles
- admins
- subscriptions
- documents
- chat_sessions
- generated_documents

Check that RLS is enabled on all tables.

## Step 4: Get Additional Credentials

You still need to set up:

1. **Gemini API Key** (for AI responses)
   - Get from: https://makersuite.google.com/app/apikey
   - Add to `backend/.env`: `GEMINI_API_KEY=your-key`

2. **Upstash Redis** (for caching)
   - Create free account: https://upstash.com
   - Create Redis database
   - Add to `backend/.env`: `REDIS_URL=your-redis-url`

3. **JWT Secret** (for authentication)
   - Generate: `openssl rand -hex 32`
   - Add to `backend/.env`: `JWT_SECRET_KEY=your-secret`

4. **Google OAuth** (optional, for Google sign-in)
   - Create credentials: https://console.cloud.google.com
   - Add to `backend/.env`: `GOOGLE_CLIENT_ID=your-client-id`

## Current Status

✅ Phase 1: Setup (14/14 tasks)
✅ Phase 2: Foundational (25/26 tasks) - T021 RLS policies ready to run
✅ Phase 3: Authentication (22/22 tasks)
✅ Phase 4: RAG + Chat (29/31 tasks) - Document generation optional

**Next**: Run migrations above, then we can proceed to Phase 5 (Chat Polish) or test the application.
