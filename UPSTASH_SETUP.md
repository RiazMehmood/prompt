# Upstash Redis Setup Guide

## Step-by-Step Instructions

### 1. Create Upstash Account
- Go to: https://upstash.com
- Click "Sign Up" (top right)
- Sign up with GitHub, Google, or Email

### 2. Create Redis Database
After logging in:

1. Click **"Create Database"** button
2. Fill in the form:
   - **Name**: `domain-adaptive-cache` (or any name you like)
   - **Type**: Select **"Regional"** (free tier)
   - **Region**: Choose closest to you (e.g., `us-east-1` or `eu-west-1`)
   - **Eviction**: Leave as default (allkeys-lru)
   - **TLS**: Keep enabled (recommended)

3. Click **"Create"**

### 3. Get Redis URL
After database is created:

1. You'll see your database dashboard
2. Scroll down to **"REST API"** section
3. Copy the **"UPSTASH_REDIS_REST_URL"**
   - It looks like: `https://your-db-name.upstash.io`
4. Copy the **"UPSTASH_REDIS_REST_TOKEN"**

### 4. Format for Our App
We need the Redis URL in this format:
```
redis://default:YOUR_TOKEN@YOUR_HOST:6379
```

**Example:**
If your REST URL is: `https://gusc1-merry-dog-12345.upstash.io`
And your token is: `AXlkAAIjcDE...`

Your REDIS_URL becomes:
```
redis://default:AXlkAAIjcDE...@gusc1-merry-dog-12345.upstash.io:6379
```

### 5. Update .env File
Copy your formatted Redis URL and paste it in:
- `backend/.env` → `REDIS_URL=your-redis-url`

## What You'll See in Upstash Dashboard

- **Database Name**: Your chosen name
- **Region**: Your selected region
- **Status**: Active (green)
- **Commands**: 0 / 10,000 daily (free tier limit)
- **Storage**: 0 MB / 256 MB (free tier limit)

## Free Tier Limits
- 10,000 commands per day
- 256 MB storage
- Perfect for our MVP caching needs!

## After Setup
Once you have the Redis URL, paste it here and I'll update the .env file for you.
