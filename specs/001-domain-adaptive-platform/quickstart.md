# Quickstart Guide: Domain-Adaptive Multi-Tenant Agentic Platform

**Last Updated**: 2026-03-14
**Branch**: `001-domain-adaptive-platform`
**Related**: [spec.md](./spec.md) | [plan.md](./plan.md) | [data-model.md](./data-model.md)

## Overview

This guide helps developers set up the development environment and understand the core workflows for the Domain-Adaptive Multi-Tenant Agentic Platform.

## Prerequisites

- **Python**: 3.11+
- **Node.js**: 18+ (for frontend)
- **Docker**: 20.10+ and Docker Compose
- **PostgreSQL**: 15+ with pgvector extension
- **Redis**: 7+
- **Git**: 2.30+

## Quick Setup (Local Development)

### 1. Clone and Setup Backend

```bash
# Clone repository
git clone <repository-url>
cd <repository-name>
git checkout 001-domain-adaptive-platform

# Setup backend
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Copy environment template
cp .env.example .env
# Edit .env with your credentials (see Environment Variables section)
```

### 2. Start Infrastructure Services

```bash
# Start PostgreSQL and Redis with Docker Compose
docker-compose up -d postgres redis

# Wait for services to be ready
docker-compose ps
```

### 3. Initialize Database

```bash
# Run migrations
cd backend
alembic upgrade head

# Apply Row-Level Security policies
psql -h localhost -U postgres -d platform_db -f src/db/rls_policies.sql

# Seed initial data (roles, sample plans)
python scripts/seed_data.py
```

### 4. Setup Frontend

```bash
# In new terminal
cd frontend
npm install

# Copy environment template
cp .env.local.example .env.local
# Edit .env.local with API URL
```

### 5. Start Development Servers

```bash
# Terminal 1: Backend
cd backend
source venv/bin/activate
uvicorn src.main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend
npm run dev
```

Access the application:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## Environment Variables

### Backend (.env)

```bash
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/platform_db

# Redis
REDIS_URL=redis://localhost:6379/0

# JWT Authentication
JWT_SECRET_KEY=<generate-with-openssl-rand-hex-32>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=30

# AI Providers
GEMINI_API_KEY=<your-gemini-api-key>
OPENAI_API_KEY=<your-openai-api-key>

# Payment Gateways
STRIPE_SECRET_KEY=<your-stripe-secret-key>
STRIPE_WEBHOOK_SECRET=<your-stripe-webhook-secret>
JAZZCASH_MERCHANT_ID=<your-jazzcash-merchant-id>
JAZZCASH_PASSWORD=<your-jazzcash-password>
EASYPAISA_STORE_ID=<your-easypaisa-store-id>
EASYPAISA_PASSWORD=<your-easypaisa-password>

# Google OAuth
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<your-email>
SMTP_PASSWORD=<your-app-password>

# SMS Gateway (for phone OTP)
SMS_GATEWAY_URL=<your-sms-gateway-url>
SMS_GATEWAY_API_KEY=<your-sms-gateway-api-key>

# Slack Alerts
SLACK_WEBHOOK_URL=<your-slack-webhook-url>

# Storage (DigitalOcean Spaces)
SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com
SPACES_KEY=<your-spaces-key>
SPACES_SECRET=<your-spaces-secret>
SPACES_BUCKET=platform-documents

# Application
ENVIRONMENT=development
DEBUG=true
CORS_ORIGINS=http://localhost:3000
```

### Frontend (.env.local)

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/v1
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<your-google-client-id>
```

## Core Workflows

### 1. User Signup Flow

**Email/Password Signup**:
```
POST /auth/signup/email
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "full_name": "John Doe",
  "role_id": "<role-uuid>"
}
→ Returns user_id and sends 6-digit verification code to email

POST /auth/verify/email
{
  "user_id": "<user-uuid>",
  "code": "123456"
}
→ Returns access_token, refresh_token, user profile
```

**Phone Signup**:
```
POST /auth/signup/phone
{
  "phone_number": "+92-300-1234567",
  "full_name": "John Doe",
  "role_id": "<role-uuid>"
}
→ Returns user_id and sends OTP to phone

POST /auth/verify/phone
{
  "user_id": "<user-uuid>",
  "otp": "123456"
}
→ Returns access_token, refresh_token, user profile
```

**Google OAuth Signup**:
```
POST /auth/signup/google
{
  "google_token": "<google-id-token>",
  "role_id": "<role-uuid>"
}
→ Returns access_token, refresh_token, user profile (instant)
```

### 2. Subscription Flow

**Start Free Trial**:
```
POST /subscriptions/start-trial
Authorization: Bearer <access-token>
{
  "plan_id": "<plan-uuid>"
}
→ Trial activated immediately (7-30 days based on plan)
```

**Subscribe to Paid Plan**:
```
POST /subscriptions/subscribe
Authorization: Bearer <access-token>
{
  "plan_id": "<plan-uuid>",
  "billing_cycle": "monthly",
  "payment_method": "card"
}
→ Returns payment_url for Stripe/JazzCash/EasyPaisa
→ User completes payment on gateway
→ Webhook activates subscription
```

### 3. Document Generation Flow

**List Available Templates**:
```
GET /documents/templates
Authorization: Bearer <access-token>
→ Returns templates filtered by user's role
```

**Generate Document**:
```
POST /documents/generate
Authorization: Bearer <access-token>
{
  "template_id": "<template-uuid>",
  "fields": {
    "client_name": "Jane Smith",
    "case_number": "2024-123",
    "date": "2026-03-14"
  }
}
→ Returns document_id with status "processing"
→ Workflow validates fields, queries RAG, generates .docx
→ Status changes to "completed" (poll or webhook)
```

**Download Generated Document**:
```
GET /documents/generated/{document_id}/download?format=docx
Authorization: Bearer <access-token>
→ Returns .docx or .pdf file
```

### 4. RAG Query Flow

**Create Chat Session**:
```
POST /chat/sessions
Authorization: Bearer <access-token>
→ Returns session_id
```

**Send Message**:
```
POST /chat/sessions/{session_id}/messages
Authorization: Bearer <access-token>
{
  "content": "What are the bail conditions for Section 302 PPC?"
}
→ Returns user_message, assistant_message, sources
→ Response includes confidence_score and document citations
→ Cached responses return instantly (cached: true)
```

**One-off Query (No Session)**:
```
POST /rag/query
Authorization: Bearer <access-token>
{
  "query": "What are the bail conditions for Section 302 PPC?",
  "top_k": 5
}
→ Returns answer, confidence_score, sources
```

### 5. Medical Exam Prep Flow (Premium Add-on)

**Start Practice Session**:
```
POST /exam-prep/practice
Authorization: Bearer <access-token>
{
  "subject": "<subject-uuid>",
  "topics": ["Anatomy", "Physiology"],
  "difficulty": "mixed",
  "question_count": 20
}
→ Returns attempt_id and questions (without correct answers)
```

**Submit Answers**:
```
POST /exam-prep/attempts/{attempt_id}/submit
Authorization: Bearer <access-token>
{
  "answers": {
    "<question-uuid-1>": "A",
    "<question-uuid-2>": "C"
  },
  "time_taken": 1200
}
→ Returns score, results with explanations, performance breakdown
```

## Testing

### Run Backend Tests

```bash
cd backend
pytest tests/unit -v
pytest tests/integration -v
pytest tests/e2e -v

# With coverage
pytest --cov=src --cov-report=html
```

### Run Frontend Tests

```bash
cd frontend
npm run test
npm run test:e2e
```

## Common Development Tasks

### Add New Role

```bash
# Via API (admin required)
POST /admin/roles
Authorization: Bearer <admin-token>
{
  "role_name": "pharmacist",
  "display_name": "Pharmacist",
  "category": "healthcare",
  "ai_persona_prompt": "You are an AI assistant for pharmacists...",
  "sidebar_features": ["chat", "documents", "prescriptions"]
}
```

### Create Subscription Plan for Role

```bash
POST /admin/plans
Authorization: Bearer <admin-token>
{
  "role_id": "<role-uuid>",
  "tier": "basic",
  "monthly_price": 1500.00,
  "features": {
    "documents_limit": 50,
    "queries_limit": 500,
    "storage_limit_mb": 1024,
    "ai_model_tier": "basic"
  },
  "trial_duration_days": 14
}
```

### Upload Knowledge Base Document

```bash
POST /documents/upload
Authorization: Bearer <access-token>
Content-Type: multipart/form-data

file: <pdf-file>
category: "legal"
title: "Pakistan Penal Code 1860"
→ Document status: "pending" (requires admin approval)
```

### Approve Pending Document (Admin)

```bash
POST /admin/documents/{document_id}/review
Authorization: Bearer <admin-token>
{
  "action": "approve",
  "quality_score": 95
}
→ Triggers embedding generation and makes document queryable
```

## Architecture Overview

### Backend Structure

```
backend/src/
├── api/v1/          # FastAPI route handlers
├── models/          # Pydantic models (request/response)
├── services/        # Business logic
│   ├── auth/        # Authentication (email, phone, OAuth)
│   ├── payments/    # Payment gateway integrations
│   ├── ai/          # Multi-provider AI with failover
│   ├── rag/         # RAG retrieval and caching
│   └── workflows/   # LangGraph workflows
├── db/              # Database migrations and RLS policies
└── config.py        # Configuration management
```

### Frontend Structure

```
frontend/src/
├── app/             # Next.js 14 App Router
│   ├── (auth)/      # Authentication pages
│   ├── (dashboard)/ # Main application
│   └── (admin)/     # Admin dashboard
├── components/      # React components
├── lib/             # API client and utilities
├── hooks/           # Custom React hooks
└── stores/          # Zustand state management
```

## Key Design Patterns

### 1. Single Agent with Role Context Injection

```python
# services/ai/provider.py
async def get_completion(prompt: str, role_id: str, tier: str):
    role = await get_role(role_id)
    system_prompt = f"{role.ai_persona_prompt}\n\nUser tier: {tier}"

    # Route to appropriate model based on tier
    model = route_model(tier, complexity=analyze_complexity(prompt))

    # Try primary provider with automatic failover
    try:
        return await gemini_client.generate(system_prompt, prompt, model)
    except Exception:
        return await openai_client.generate(system_prompt, prompt, model)
```

### 2. Query Caching for Cost Reduction

```python
# services/rag/cache.py
async def get_cached_or_query(query: str, role_id: str):
    cache_key = f"rag:{role_id}:{hash(query)}"

    # Check cache first
    cached = await redis.get(cache_key)
    if cached:
        return json.loads(cached), True

    # Query RAG system
    result = await rag_query(query, role_id)

    # Cache for 7 days
    await redis.setex(cache_key, 604800, json.dumps(result))
    return result, False
```

### 3. Row-Level Security (RLS)

```sql
-- db/rls_policies.sql
CREATE POLICY tenant_isolation ON users
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation ON documents
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

```python
# api/dependencies.py
async def set_tenant_context(user: User, db: Session):
    await db.execute(
        text("SET app.current_tenant_id = :tenant_id"),
        {"tenant_id": str(user.tenant_id)}
    )
```

## Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check connection
psql -h localhost -U postgres -d platform_db -c "SELECT 1;"

# Reset database
docker-compose down -v
docker-compose up -d postgres
alembic upgrade head
```

### Redis Connection Issues

```bash
# Check Redis is running
docker-compose ps redis

# Test connection
redis-cli -h localhost ping
```

### AI Provider Failures

```bash
# Check API keys in .env
echo $GEMINI_API_KEY
echo $OPENAI_API_KEY

# Test Gemini API
curl -H "Authorization: Bearer $GEMINI_API_KEY" \
  https://generativelanguage.googleapis.com/v1/models

# Check failover logs
tail -f backend/logs/ai_provider.log
```

### Payment Webhook Not Received

```bash
# For local development, use ngrok to expose webhook endpoint
ngrok http 8000

# Update webhook URL in payment gateway dashboard
# Stripe: https://dashboard.stripe.com/webhooks
# JazzCash: Contact support
# EasyPaisa: Contact support

# Test webhook locally
curl -X POST http://localhost:8000/v1/payments/webhook/stripe \
  -H "Content-Type: application/json" \
  -d @tests/fixtures/stripe_webhook.json
```

## Next Steps

1. **Read the full specification**: [spec.md](./spec.md)
2. **Review implementation plan**: [plan.md](./plan.md)
3. **Understand data model**: [data-model.md](./data-model.md)
4. **Explore API contracts**: [contracts/](./contracts/)
5. **Run tests**: `pytest` (backend) and `npm test` (frontend)
6. **Deploy to staging**: See [infrastructure/README.md](../../infrastructure/README.md)

## Support

- **Documentation**: `/docs` directory
- **API Reference**: http://localhost:8000/docs (Swagger UI)
- **Issues**: GitHub Issues
- **Slack**: #platform-dev channel
