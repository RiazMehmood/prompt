# Quick Start Guide - Run This Now!

## Step 1: Run Database Migration (2 minutes)

1. Open Supabase SQL Editor:
   **https://supabase.com/dashboard/project/ypxflnyritmmhszqfebr/sql**

2. Click **"New Query"**

3. Open this file: `backend/supabase/COMBINED_MIGRATION.sql`

4. Copy ALL the contents and paste into Supabase SQL Editor

5. Click **"Run"** (or press Ctrl+Enter)

6. You should see: "Success. No rows returned"

## Step 2: Seed Initial Data (1 minute)

After migration succeeds, we need to add:
- 1 lawyer role
- 1 admin user (admin@example.com / admin123)
- 5 sample legal documents

**I'll create a simple SQL seed script for you to run next.**

## Step 3: Setup Upstash Redis (Optional - 5 minutes)

For caching (makes app faster):

1. Go to: **https://upstash.com**
2. Sign up (free)
3. Create Redis database:
   - Name: `domain-adaptive-cache`
   - Type: **Regional** (free tier)
   - Region: Choose closest to you
4. Copy the **REST URL** and **Token**
5. Format as: `redis://default:YOUR_TOKEN@YOUR_HOST:6379`
6. Give me the URL to update backend/.env

**Or say "skip redis" to proceed without caching.**

## What Happens After Migration?

✅ All database tables created
✅ pgvector enabled for AI embeddings
✅ Row-Level Security policies active
✅ Ready to seed data and test!

## Current Status

- ✅ Supabase configured
- ✅ Gemini API configured
- ✅ JWT secret generated
- ⏳ Waiting for: Migration run + Redis URL (optional)

**Run the migration now, then let me know when it's done!**
