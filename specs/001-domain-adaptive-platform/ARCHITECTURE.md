# Architecture Overview: Domain-Adaptive Multi-Tenant Agentic Platform

**Last Updated**: 2026-03-14
**Status**: Draft

## Executive Summary

A highly scalable, cost-optimized SaaS platform serving multiple professional domains (Lawyers, Teachers, Doctors, Engineers, Officers) in Pakistan through a single unified agent with role-based context injection, intelligent caching, and tiered AI model routing.

---

## Core Architecture Decisions

### 1. Single Agent vs Multiple Agents: **SINGLE AGENT** ✅

**Decision**: One unified conversational agent with dynamic role context injection.

**Rationale**:
- Admin-created roles require dynamic configuration, not separate agent instances
- Role switching (deprecated) and multi-role users are handled via context, not routing
- Shared RAG infrastructure with category-based filtering
- Lower operational cost and complexity
- Easier maintenance and updates

**Implementation**:
```python
# Pseudo-code
system_prompt = f"""
You are a {user.role.display_name} assistant.
{user.role.ai_persona_prompt}

Available document types: {user.role.document_templates}
User can only access documents in category: {user.role.category}
Subscription tier: {user.subscription.tier} (affects AI model quality)
"""

# RAG query automatically filtered
documents = vector_db.search(
    query=user_query,
    filter={"category": user.role.category, "status": "approved"}
)
```

---

## Subscription & Monetization Model

### Subscription Tiers (Per Role)

| Tier | Documents/Month | Queries/Month | AI Model | Storage | Price Range |
|------|----------------|---------------|----------|---------|-------------|
| **Basic** | 50 | 200 | Flash only | 100MB | PKR 500-1000 |
| **Pro** | 150 | Unlimited | Flash/Pro mix | 500MB | PKR 800-3000 |
| **Premium** | Unlimited | Unlimited | Pro only | 2GB | PKR 1200-5000 |

### Role-Specific Pricing (Monthly)

| Role | Basic | Pro | Premium |
|------|-------|-----|---------|
| Teacher | PKR 500 | PKR 800 | PKR 1200 |
| Doctor | PKR 2000 | PKR 3000 | PKR 5000 |
| Lawyer | PKR 2000 | PKR 3000 | PKR 5000 |
| Engineer | PKR 1500 | PKR 2000 | PKR 3500 |
| Officer | PKR 1000 | PKR 1500 | PKR 2500 |

**Discounts**:
- 6-Month: 5% off (e.g., PKR 4500 instead of PKR 4800)
- Yearly: 15% off (e.g., PKR 8000 instead of PKR 9600)

### Premium Add-Ons

**Medical Exam Prep** (Doctors only): +PKR 1500/month
- 5000+ MCQs (USMLE, PLAB, PMDC)
- Timed practice tests
- Performance analytics
- Detailed explanations with references

**Future Add-Ons**:
- Student Exam Prep (Teachers): +PKR 500/month
- Case Law Analytics (Lawyers): +PKR 1000/month
- Project Management Tools (Engineers): +PKR 800/month

**Free Trial**:
- Duration: 14 days (configurable by admin: 7/14/21/30 days)
- Limits: 10 documents, 50 queries (configurable per role)
- Admin can adjust trial settings in real-time from dashboard

### Payment Gateways

1. **JazzCash** - Mobile wallet (primary for retail users)
2. **EasyPaisa** - Mobile wallet (primary for retail users)
3. **Stripe** - Debit/Credit Card payments (Visa, Mastercard, local Pakistani cards)

**All payments are fully automated with webhook verification - NO manual processing**

**Payment Flow**:
```
User selects plan → Choose payment method →
  - Card: Stripe checkout with tokenization →
  - JazzCash/EasyPaisa: Gateway redirect with OTP →
Payment confirmation → Webhook verification → Subscription activation →
Email confirmation + Dashboard update
```

**Card Payment Security**:
- PCI-DSS compliant via Stripe
- Card tokenization (never store raw card numbers)
- Real-time validation (card format, expiry, CVV)
- 3D Secure authentication for Pakistani cards
- Save payment methods for one-click renewal

---

## Cost Optimization Strategies

### 1. Intelligent Query Caching

**Problem**: Multiple users asking identical questions (e.g., "generate 10 MCQs from Chapter 8 of Sindh Board Science")

**Solution**: Query cache with 7-day TTL

```python
# Query normalization
normalized_query = normalize(user_query)  # lowercase, trim, standardize
cache_key = sha256(normalized_query + role_id + category)

# Check cache first
cached_response = redis.get(cache_key)
if cached_response:
    return cached_response  # No AI API call!

# If not cached, call AI and cache result
response = ai_model.generate(query)
redis.setex(cache_key, ttl=7*24*3600, value=response)
return response
```

**Expected Impact**: 40% cache hit rate = 40% reduction in AI API costs

### 2. AI Model Routing (Tiered Intelligence)

**Problem**: Using expensive models (Gemini 1.5 Pro) for simple queries wastes money

**Solution**: Route queries to appropriate models based on complexity and subscription tier

**Complexity Detection Heuristics**:
```python
def determine_complexity(query):
    score = 0

    # Word count
    if len(query.split()) > 50: score += 2

    # Technical terminology
    if has_technical_terms(query): score += 2

    # Multi-hop reasoning indicators
    if any(word in query for word in ["analyze", "compare", "synthesize", "evaluate"]):
        score += 3

    # Document generation (always complex)
    if "generate" in query or "create" in query:
        score += 3

    return "complex" if score >= 5 else "simple"
```

**Model Selection Matrix**:

| Subscription Tier | Simple Query | Complex Query |
|-------------------|--------------|---------------|
| Basic | Flash | Flash |
| Pro | Flash | Pro (30% of time) |
| Premium | Pro | Pro |

**Cost Comparison**:
- Gemini 1.5 Flash: $0.075 per 1M input tokens, $0.30 per 1M output tokens
- Gemini 1.5 Pro: $1.25 per 1M input tokens, $5.00 per 1M output tokens

**Expected Impact**: 70% of queries use Flash = 60% cost reduction vs Pro-only

### 3. Batch Processing for Common Queries

**Problem**: 5 teachers request "10 MCQs from Chapter 8" within 1 hour

**Solution**: Detect similar pending requests and batch them

```python
# Detect similar queries in queue
similar_queries = find_similar_in_queue(query, time_window=3600)

if len(similar_queries) >= 3:
    # Generate once, serve to all
    response = ai_model.generate(query)
    for user_id in similar_queries:
        deliver_response(user_id, response)
        cache_response(query, response)
```

**Expected Impact**: 20% reduction in duplicate generation requests

### 4. Embedding Model Optimization

**Problem**: Using expensive generative models for embeddings

**Solution**: Use specialized embedding models

- **Current**: text-embedding-004 ($0.00002 per 1K tokens)
- **Alternative**: Cheaper open-source models (sentence-transformers)

### 5. Infrastructure Cost Optimization

**DigitalOcean Managed Services** (Cheaper than AWS/GCP for MVP):

| Service | Specs | Monthly Cost |
|---------|-------|--------------|
| Managed Kubernetes | 3 nodes (2 vCPU, 4GB RAM each) | $72 |
| Managed PostgreSQL | 2GB RAM, 25GB storage | $15 |
| Managed Redis | 1GB RAM | $15 |
| Spaces (S3-compatible) | 250GB storage + CDN | $5 |
| Load Balancer | 1 instance | $12 |
| **Total** | | **$119/month** |

**Scaling Strategy**:
- Start with 3 Kubernetes nodes
- Auto-scale up to 10 nodes at 70% CPU
- Scale down during off-peak hours (12am-6am PKT)

**Expected Capacity**: 1000 concurrent users on base infrastructure

---

## Technical Stack (Cost-Optimized)

### Backend
- **Language**: Python 3.11 (FastAPI for API, LangChain for agents)
- **AI Models**:
  - Gemini 1.5 Flash (primary, cheap)
  - Gemini 1.5 Pro (complex queries, premium users)
  - text-embedding-004 (embeddings)
- **Vector DB**: Supabase pgvector (free tier: 500MB, then $25/month for 8GB)
- **Database**: DigitalOcean Managed PostgreSQL with RLS
- **Cache**: DigitalOcean Managed Redis
- **Storage**: DigitalOcean Spaces (S3-compatible) with CDN
- **Queue**: Redis Queue (RQ) for async tasks

### Frontend
- **Framework**: Next.js 14 (React) with TypeScript
- **UI**: Tailwind CSS + shadcn/ui components
- **State**: Zustand (lightweight, no Redux overhead)
- **API Client**: TanStack Query (React Query) for caching

### Infrastructure
- **Containerization**: Docker
- **Orchestration**: DigitalOcean Managed Kubernetes
- **CI/CD**: GitHub Actions (free for public repos)
- **Monitoring**: Prometheus + Grafana (self-hosted on K8s)
- **Logging**: Loki (self-hosted, cheaper than CloudWatch)

### Payment Integration
- **JazzCash**: REST API with webhook verification
- **EasyPaisa**: REST API with webhook verification
- **Stripe**: Checkout API with card tokenization, webhook verification, PCI-DSS compliance

**Stripe Integration Details**:
- Use Stripe Checkout for secure card payment form
- Support PKR currency (or USD equivalent if PKR not available)
- Tokenize cards for saved payment methods (one-click renewal)
- Real-time card validation (format, expiry, CVV)
- 3D Secure (SCA) authentication for Pakistani cards
- Webhook events: `payment_intent.succeeded`, `payment_intent.failed`, `customer.subscription.updated`

---

## Database Schema (Key Tables)

### Core Tables

**users**
```sql
CREATE TABLE users (
    user_id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id UUID REFERENCES roles(role_id),
    full_name VARCHAR(255),
    phone_number VARCHAR(20),
    account_status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);
```

**roles**
```sql
CREATE TABLE roles (
    role_id UUID PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    category VARCHAR(50),
    ai_persona_prompt TEXT,
    sidebar_features JSONB,
    subscription_pricing JSONB,
    is_active BOOLEAN DEFAULT true
);
```

**subscriptions**
```sql
CREATE TABLE user_subscriptions (
    subscription_id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(user_id),
    role_id UUID REFERENCES roles(role_id),
    tier VARCHAR(20), -- 'basic', 'pro', 'premium'
    billing_cycle VARCHAR(20), -- 'monthly', 'six_month', 'yearly'
    start_date DATE,
    end_date DATE,
    status VARCHAR(20), -- 'trial', 'active', 'expired', 'cancelled'
    documents_used INT DEFAULT 0,
    queries_used INT DEFAULT 0,
    auto_renew BOOLEAN DEFAULT true
);
```

**query_cache**
```sql
CREATE TABLE query_cache (
    cache_id UUID PRIMARY KEY,
    query_hash VARCHAR(64) UNIQUE,
    role_id UUID,
    category VARCHAR(50),
    query_text TEXT,
    response_text TEXT,
    ai_model_used VARCHAR(50),
    hit_count INT DEFAULT 0,
    created_at TIMESTAMP,
    last_accessed TIMESTAMP,
    expires_at TIMESTAMP
);

CREATE INDEX idx_query_hash ON query_cache(query_hash);
CREATE INDEX idx_expires_at ON query_cache(expires_at);
```

**exam_questions** (for Medical Exam Prep)
```sql
CREATE TABLE exam_questions (
    question_id UUID PRIMARY KEY,
    subject VARCHAR(100),
    topic VARCHAR(100),
    difficulty VARCHAR(20),
    question_text TEXT,
    options JSONB, -- [{option: 'A', text: '...', is_correct: true}, ...]
    explanation TEXT,
    references TEXT,
    source VARCHAR(50), -- 'admin_upload', 'user_contribution', 'ai_generated'
    status VARCHAR(20) DEFAULT 'approved'
);

CREATE INDEX idx_subject_topic ON exam_questions(subject, topic);
```

---

## Security & Compliance

### Row-Level Security (RLS)

**Enforce tenant isolation at database level**:

```sql
-- Enable RLS on documents table
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see documents matching their role's category
CREATE POLICY user_document_access ON documents
    FOR SELECT
    USING (
        category = (
            SELECT r.category
            FROM users u
            JOIN roles r ON u.role_id = r.role_id
            WHERE u.user_id = current_user_id()
        )
        AND status = 'approved'
    );
```

### Data Protection

- **Passwords**: bcrypt hashing with salt
- **API Keys**: Stored in environment variables, never in code
- **Payment Data**: Never stored (handled by payment gateways)
- **PII**: Encrypted at rest using PostgreSQL encryption
- **Audit Logs**: All data access logged with user_id, timestamp, IP

---

## Scalability Architecture

### Horizontal Scaling with Kubernetes

```yaml
# Deployment configuration
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  replicas: 3  # Start with 3 pods
  selector:
    matchLabels:
      app: api-server
  template:
    spec:
      containers:
      - name: api
        image: registry.digitalocean.com/myapp/api:latest
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
---
# Horizontal Pod Autoscaler
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-server-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### Load Balancing

- **DigitalOcean Load Balancer**: Distributes traffic across Kubernetes nodes
- **Kubernetes Service**: Internal load balancing across pods
- **Health Checks**: `/health` endpoint for liveness/readiness probes

### Caching Strategy

**Multi-Layer Caching**:

1. **Browser Cache**: Static assets (CSS, JS, images) - 7 days
2. **CDN Cache**: Generated documents, uploaded PDFs - 30 days
3. **Redis Cache**:
   - Session data - 24 hours
   - Query responses - 7 days
   - User profile data - 1 hour
4. **Database Query Cache**: PostgreSQL query cache for frequent reads

---

## Monitoring & Observability

### Key Metrics to Track

**Business Metrics**:
- Active subscriptions by tier/role
- Monthly Recurring Revenue (MRR)
- Churn rate
- Average Revenue Per User (ARPU)
- Conversion rate (trial → paid)

**Technical Metrics**:
- API response time (p50, p95, p99)
- Cache hit rate (query cache, Redis)
- AI API costs per user/role
- Database query performance
- Error rate by endpoint
- Kubernetes pod CPU/memory usage

**Cost Metrics**:
- AI API costs (Gemini Flash vs Pro usage)
- Infrastructure costs (K8s, DB, Redis, Storage)
- Bandwidth costs
- Cost per user
- Cost per query

### Alerting Rules

```yaml
# Prometheus alerting rules
groups:
  - name: cost_alerts
    rules:
      - alert: HighAICosts
        expr: sum(ai_api_cost_usd) > 500
        for: 1h
        annotations:
          summary: "AI API costs exceeded $500 in last hour"

      - alert: LowCacheHitRate
        expr: query_cache_hit_rate < 0.3
        for: 30m
        annotations:
          summary: "Query cache hit rate below 30%"

      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "Error rate above 5%"
```

---

## Deployment Strategy

### CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build Docker image
        run: docker build -t registry.digitalocean.com/myapp/api:${{ github.sha }} .

      - name: Push to registry
        run: docker push registry.digitalocean.com/myapp/api:${{ github.sha }}

      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/api-server \
            api=registry.digitalocean.com/myapp/api:${{ github.sha }}
          kubectl rollout status deployment/api-server
```

### Blue-Green Deployment

- Deploy new version alongside old version
- Route 10% traffic to new version (canary)
- Monitor error rates for 10 minutes
- If stable, route 100% traffic to new version
- Keep old version for 1 hour for quick rollback

---

## Cost Projections

### MVP Phase (0-1000 users)

| Item | Monthly Cost |
|------|--------------|
| DigitalOcean Infrastructure | $119 |
| Gemini API (40% cache hit, 70% Flash) | $150 |
| Supabase pgvector | $25 |
| Domain + SSL | $2 |
| **Total** | **$296/month** |

**Revenue Projection** (1000 users, 50% paid):
- 500 paid users × average PKR 1500/month = PKR 750,000/month
- At PKR 280/USD = **$2,678/month**

**Profit Margin**: $2,678 - $296 = **$2,382/month (89% margin)**

### Growth Phase (10,000 users)

| Item | Monthly Cost |
|------|--------------|
| DigitalOcean Infrastructure (scaled) | $500 |
| Gemini API | $1,200 |
| Supabase pgvector | $100 |
| CDN Bandwidth | $50 |
| **Total** | **$1,850/month** |

**Revenue Projection** (10,000 users, 40% paid):
- 4,000 paid users × average PKR 1500/month = PKR 6,000,000/month
- At PKR 280/USD = **$21,428/month**

**Profit Margin**: $21,428 - $1,850 = **$19,578/month (91% margin)**

---

## Risk Mitigation

### Technical Risks

| Risk | Mitigation |
|------|------------|
| AI API rate limits | Implement caching, model routing, request queuing |
| Database performance | Use RLS, proper indexing, connection pooling, read replicas |
| Payment gateway downtime | Support multiple gateways, manual bank transfer fallback |
| Kubernetes pod crashes | Health checks, auto-restart, graceful degradation |
| Cache invalidation bugs | TTL-based expiry, manual cache clear in admin dashboard |

### Business Risks

| Risk | Mitigation |
|------|------------|
| Low conversion rate | Extended free trial, referral program, promotional pricing |
| High churn rate | Usage warnings at 80%, seamless renewal, data preservation |
| Payment fraud | Manual verification for high-value transactions, IP tracking |
| Competitor pricing | Dynamic pricing control, value-added features (exam prep) |

---

## Next Steps

1. **Finalize spec.md** with all new requirements ✅
2. **Create plan.md** with detailed implementation architecture
3. **Create tasks.md** with actionable development tasks
4. **Set up infrastructure** (DigitalOcean account, Kubernetes cluster)
5. **Implement MVP** (authentication, role management, basic RAG, payment integration)
6. **Launch beta** with 50 test users across all roles
7. **Iterate based on feedback** and scale infrastructure

---

**Document Version**: 1.0
**Last Updated**: 2026-03-14
**Next Review**: After plan.md and tasks.md creation
