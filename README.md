# Domain-Adaptive Platform - Checkpoint 1 (Free MVP)

Multi-platform application (Backend API + Web Frontend + Mobile App) for lawyers domain using 100% free tier services.

## Architecture

- **Backend**: FastAPI + Python 3.11 (Vercel Serverless Functions)
- **Frontend**: Next.js 14 + React 18 + Tailwind CSS + shadcn/ui
- **Mobile**: Expo SDK 50 + React Native 0.73 + NativeWind + React Native Paper
- **Database**: Supabase Free (PostgreSQL + pgvector, 500MB limit)
- **Cache**: Upstash Redis Free (10,000 commands/day)
- **AI**: Gemini 1.5 Flash Free (15 RPM limit)
- **Auth**: Supabase Auth + Google OAuth + Biometric (Face ID/Touch ID/Fingerprint)

## Project Structure

```
.
├── backend/          # FastAPI backend (Python 3.11)
├── frontend/         # Next.js 14 web app
├── mobile/           # Expo mobile app
├── shared/           # Shared code (hooks, stores, types, api, lib)
└── package.json      # npm workspaces root
```

## Setup

### Prerequisites

- Node.js 18+
- Python 3.11+
- npm or yarn

### Environment Variables

1. Copy `.env.example` files:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.local.example frontend/.env.local
   cp mobile/.env.example mobile/.env
   ```

2. Fill in your credentials:
   - Supabase: Create project at https://supabase.com
   - Gemini: Get API key at https://makersuite.google.com/app/apikey
   - Google OAuth: Create credentials at https://console.cloud.google.com
   - Upstash Redis: Create database at https://upstash.com

### Installation

```bash
# Install all dependencies (workspaces)
npm install

# Install Python dependencies
cd backend
pip install -r requirements.txt
```

### Development

```bash
# Run frontend (Next.js)
npm run dev:frontend

# Run mobile (Expo)
npm run dev:mobile

# Run backend (FastAPI)
cd backend
uvicorn src.main:app --reload
```

## Free Tier Limits

- **Supabase**: 500MB database, 2GB bandwidth/month
- **Upstash Redis**: 10,000 commands/day
- **Gemini Flash**: 15 requests/minute
- **Vercel**: 100GB bandwidth/month, 100 hours serverless execution

## Cost

**$0/month** - All services on free tier

## Deployment

- **Backend**: Vercel Serverless Functions (automatic via `vercel.json`)
- **Frontend**: Vercel (automatic via Next.js detection)
- **Mobile**: Expo EAS Build (free tier)

## License

MIT
