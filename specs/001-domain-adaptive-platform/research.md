# Research & Technical Decisions

**Feature**: Domain-Adaptive Multi-Tenant Agentic Platform
**Date**: 2026-03-14
**Status**: In Progress

## Overview

This document consolidates research findings for key technical decisions required to implement the Domain-Adaptive Multi-Tenant Agentic Platform. Each section addresses a specific unknown or technology choice from the Technical Context.

---

## 1. Multi-Provider AI Failover Strategy

**Decision**: Implement abstraction layer with automatic failover between Gemini (primary) and OpenAI (backup)

**Rationale**:
- Single provider dependency creates single point of failure
- API outages or rate limits can block all user requests
- Different providers have different strengths (Gemini: cost-effective, OpenAI: reliability)
- Automatic failover ensures service continuity without manual intervention

**Implementation Approach**:

```python
# Abstract provider interface
class AIProvider(ABC):
    @abstractmethod
    async def generate(self, prompt: str, model: str) -> str:
        pass

    @abstractmethod
    async def health_check(self) -> bool:
        pass

# Failover manager
class AIFailoverManager:
    def __init__(self, primary: AIProvider, backup: AIProvider):
        self.primary = primary
        self.backup = backup
        self.current = primary

    async def generate(self, prompt: str, model: str) -> str:
        try:
            return await self.current.generate(prompt, model)
        except (TimeoutError, RateLimitError, APIError) as e:
            logger.warning(f"Primary provider failed: {e}, failing over to backup")
            self.current = self.backup
            return await self.backup.generate(prompt, model)
```

**Model Tier Mapping**:
- Basic tier: Gemini 1.5 Flash → GPT-4o-mini
- Pro tier: Gemini 1.5 Flash/Pro → GPT-4o-mini/GPT-4o
- Premium tier: Gemini 1.5 Pro → GPT-4o

**Alternatives Considered**:
- Single provider (Gemini only): Rejected due to single point of failure
- Three providers (add Claude): Rejected due to complexity and cost
- Load balancing across providers: Rejected due to inconsistent response quality

**Cost Impact**:
- Gemini 1.5 Flash: $0.075/1M input, $0.30/1M output
- GPT-4o-mini: $0.15/1M input, $0.60/1M output (2x cost)
- Expected failover rate: <5% of requests
- Additional cost: ~$10/month for 1000 users

---

## 2. Authentication Methods Integration

**Decision**: Support three authentication methods with unified user model

**Rationale**:
- Different users prefer different authentication methods
- Email/password: Traditional, familiar to most users
- Phone OTP: Required for payment gateway integration (JazzCash/EasyPaisa)
- Google OAuth: Fastest signup, reduces friction

**Implementation Approach**:

```python
# User model with nullable fields
class User(BaseModel):
    user_id: UUID
    email: Optional[str] = None  # Nullable for phone-only signups
    password_hash: Optional[str] = None  # Nullable for OAuth/phone
    phone_number: Optional[str] = None  # Nullable for email/OAuth
    auth_method: Literal['email', 'phone', 'google']
    google_id: Optional[str] = None  # For OAuth users
    email_verified: bool = False
    phone_verified: bool = False

# Authentication service
class AuthService:
    async def signup_email(self, email: str, password: str) -> User:
        # Send 6-digit verification code via email
        pass

    async def signup_phone(self, phone: str) -> User:
        # Send SMS OTP via Twilio/SNS
        pass

    async def signup_google(self, google_token: str) -> User:
        # Verify token with Google, extract email/name
        pass
```

**SMS Gateway Options**:
- Twilio: $0.0079/SMS (Pakistan), reliable but expensive
- AWS SNS: $0.00645/SMS (Pakistan), good integration
- Local Pakistani SMS gateway: ~$0.003/SMS, cheaper but less reliable

**Recommendation**: Start with Twilio for reliability, switch to local gateway if volume justifies cost savings

**Alternatives Considered**:
- Email + Phone required (AND): Rejected due to user friction
- Email only: Rejected due to payment gateway requirements
- Phone only: Rejected due to limited user preference

---

## 3. Query Caching Strategy

**Decision**: Redis-based semantic cache with 7-day TTL and query normalization

**Rationale**:
- 40% of queries are similar or identical (e.g., "generate 10 MCQs from Chapter 8")
- AI API costs are per-token, caching reduces costs by 40%
- Redis provides fast lookup (<1ms) and automatic expiration

**Implementation Approach**:

```python
# Query normalization
def normalize_query(query: str) -> str:
    # Lowercase, remove extra spaces, standardize punctuation
    return re.sub(r'\s+', ' ', query.lower().strip())

# Cache key generation
def cache_key(query: str, role_id: str, category: str) -> str:
    normalized = normalize_query(query)
    return hashlib.sha256(f"{normalized}:{role_id}:{category}".encode()).hexdigest()

# Cache service
class QueryCache:
    def __init__(self, redis_client: Redis):
        self.redis = redis_client
        self.ttl = 7 * 24 * 3600  # 7 days

    async def get(self, query: str, role_id: str, category: str) -> Optional[str]:
        key = cache_key(query, role_id, category)
        cached = await self.redis.get(key)
        if cached:
            await self.redis.incr(f"{key}:hits")  # Track hit count
        return cached

    async def set(self, query: str, role_id: str, category: str, response: str):
        key = cache_key(query, role_id, category)
        await self.redis.setex(key, self.ttl, response)
```

**Cache Invalidation**:
- Time-based: 7-day TTL (automatic)
- Manual: Admin can clear cache for specific role/category
- Document updates: Clear cache when new documents approved for a category

**Alternatives Considered**:
- In-memory cache (Python dict): Rejected due to no persistence across pod restarts
- Database cache: Rejected due to slower lookup (10-50ms vs <1ms)
- Longer TTL (30 days): Rejected due to stale data risk

**Expected Impact**:
- Cache hit rate: 40% (based on similar SaaS platforms)
- Cost reduction: 40% of AI API costs = ~$60/month savings for 1000 users
- Latency improvement: Cached responses return in <100ms vs 2-5s for AI API

---

## 4. Payment Gateway Integration

**Decision**: Integrate three payment gateways with unified payment abstraction

**Rationale**:
- Pakistani users prefer mobile wallets (JazzCash, EasyPaisa) over cards
- International users and some professionals prefer card payments (Stripe)
- Multiple options increase conversion rate

**Implementation Approach**:

```python
# Payment provider interface
class PaymentProvider(ABC):
    @abstractmethod
    async def create_payment(self, amount: Decimal, currency: str, metadata: dict) -> str:
        """Returns payment URL or transaction ID"""
        pass

    @abstractmethod
    async def verify_payment(self, transaction_id: str) -> PaymentStatus:
        pass

# Stripe implementation
class StripeProvider(PaymentProvider):
    async def create_payment(self, amount: Decimal, currency: str, metadata: dict) -> str:
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': currency,
                    'product_data': {'name': metadata['plan_name']},
                    'unit_amount': int(amount * 100),
                },
                'quantity': 1,
            }],
            mode='subscription',
            success_url=metadata['success_url'],
            cancel_url=metadata['cancel_url'],
        )
        return session.url

# JazzCash implementation (REST API)
class JazzCashProvider(PaymentProvider):
    async def create_payment(self, amount: Decimal, currency: str, metadata: dict) -> str:
        # JazzCash Mobile Account API
        # Returns payment URL for mobile wallet
        pass
```

**Webhook Handling**:
- Stripe: `payment_intent.succeeded`, `customer.subscription.updated`
- JazzCash: Custom webhook endpoint with HMAC signature verification
- EasyPaisa: Similar to JazzCash

**Alternatives Considered**:
- Stripe only: Rejected due to low card penetration in Pakistan
- Manual bank transfer: Rejected due to automation requirement
- Cryptocurrency: Rejected due to regulatory uncertainty in Pakistan

**Cost**:
- Stripe: 2.9% + PKR 15 per transaction
- JazzCash: 1.5% per transaction
- EasyPaisa: 1.5% per transaction

---

## 5. Dynamic Scaling Strategy

**Decision**: Kubernetes Horizontal Pod Autoscaler (HPA) with CPU/memory-based scaling

**Rationale**:
- No fixed concurrent user limits required
- Scale up during peak hours, scale down during off-peak
- Cost-effective: pay only for resources used

**Implementation Approach**:

```yaml
# Horizontal Pod Autoscaler
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 25
        periodSeconds: 60
```

**Scaling Triggers**:
- CPU > 70%: Scale up by 50% (e.g., 3 pods → 5 pods)
- Memory > 80%: Scale up by 50%
- CPU < 40% for 5 minutes: Scale down by 25%

**Resource Limits**:
- Per pod: 500m CPU, 1Gi memory (requests), 1000m CPU, 2Gi memory (limits)
- Min replicas: 3 (high availability)
- Max replicas: 10 (cost control)

**Alternatives Considered**:
- Fixed replicas: Rejected due to over-provisioning during off-peak
- Vertical scaling: Rejected due to downtime during scaling
- Serverless (Cloud Run): Rejected due to cold start latency

**Expected Capacity**:
- 3 pods: ~300 concurrent users
- 10 pods: ~1000 concurrent users
- Cost: $72/month (3 pods) to $240/month (10 pods)

---

## 6. Admin Alerting System

**Decision**: Email + Slack webhook for critical alerts with configurable thresholds

**Rationale**:
- Email: Reliable, works for all admins
- Slack: Real-time, better for team collaboration
- Configurable thresholds: Different alerts have different urgency

**Implementation Approach**:

```python
# Alert severity levels
class AlertSeverity(Enum):
    CRITICAL = "critical"  # Immediate action required
    WARNING = "warning"    # Review within 1 hour
    INFO = "info"          # Daily digest

# Alert service
class AlertService:
    def __init__(self, smtp_client, slack_webhook_url):
        self.smtp = smtp_client
        self.slack_url = slack_webhook_url

    async def send_alert(self, severity: AlertSeverity, title: str, description: str, metadata: dict):
        # Send email
        await self.smtp.send(
            to=os.getenv("ADMIN_EMAIL"),
            subject=f"[{severity.value.upper()}] {title}",
            body=self._format_email(description, metadata)
        )

        # Send Slack for critical/warning
        if severity in [AlertSeverity.CRITICAL, AlertSeverity.WARNING]:
            await self._send_slack(severity, title, description, metadata)

    async def _send_slack(self, severity, title, description, metadata):
        color = "danger" if severity == AlertSeverity.CRITICAL else "warning"
        payload = {
            "attachments": [{
                "color": color,
                "title": title,
                "text": description,
                "fields": [{"title": k, "value": str(v), "short": True} for k, v in metadata.items()]
            }]
        }
        await httpx.post(self.slack_url, json=payload)
```

**Alert Types**:
- **Critical**: Payment failures (>3 consecutive), AI API outages, RLS violations, error rate >5%
- **Warning**: Free-tier usage >80%, API latency >1s p95, failed login spikes
- **Info**: New user signups, document approval backlog >50

**Alternatives Considered**:
- SMS alerts: Rejected due to cost ($0.01/SMS) and noise
- PagerDuty: Rejected due to cost ($29/user/month) for MVP
- Dashboard only: Rejected due to requiring manual checking

**Cost**: $0 (Email via SMTP, Slack webhook free)

---

## 7. Document Chunking Strategy for RAG

**Decision**: Recursive character splitting with 512 token chunks and 50 token overlap

**Rationale**:
- 512 tokens: Optimal for semantic coherence (not too small, not too large)
- 50 token overlap: Prevents context loss at chunk boundaries
- Recursive splitting: Respects document structure (paragraphs, sentences)

**Implementation Approach**:

```python
from langchain.text_splitter import RecursiveCharacterTextSplitter

# Chunking configuration
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=512,  # tokens
    chunk_overlap=50,
    length_function=lambda text: len(tiktoken.encoding_for_model("gpt-4").encode(text)),
    separators=["\n\n", "\n", ". ", " ", ""]
)

# Chunking with metadata preservation
def chunk_document(document: Document) -> List[Chunk]:
    chunks = text_splitter.split_text(document.content)
    return [
        Chunk(
            content=chunk,
            document_id=document.id,
            chunk_index=i,
            metadata={
                **document.metadata,
                "chunk_index": i,
                "total_chunks": len(chunks)
            }
        )
        for i, chunk in enumerate(chunks)
    ]
```

**Embedding Model**: text-embedding-004 (1536 dimensions, $0.00002/1K tokens)

**Alternatives Considered**:
- Fixed 256 tokens: Rejected due to loss of context
- Fixed 1024 tokens: Rejected due to reduced retrieval precision
- Semantic chunking (by topic): Rejected due to complexity and unreliability

**Storage Impact**:
- 200-page document: ~100K tokens → ~200 chunks
- 200 chunks × 1536 dims × 4 bytes = ~1.2MB per document
- 1000 documents: ~1.2GB vector storage

---

## 8. Row-Level Security (RLS) Implementation

**Decision**: PostgreSQL RLS policies with tenant_id filtering on all tables

**Rationale**:
- Defense-in-depth: Even if application code has bugs, database enforces isolation
- PostgreSQL native feature: No additional dependencies
- Automatic enforcement: Cannot be bypassed by application code

**Implementation Approach**:

```sql
-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own data
CREATE POLICY user_isolation ON users
    FOR ALL
    USING (user_id = current_setting('app.current_user_id')::uuid);

-- Policy: Users can only see documents in their tenant
CREATE POLICY tenant_document_isolation ON documents
    FOR SELECT
    USING (
        tenant_id = current_setting('app.current_tenant_id')::uuid
        AND status = 'approved'
    );

-- Policy: Users can only see subscriptions in their tenant
CREATE POLICY tenant_subscription_isolation ON subscriptions
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

**Application Integration**:

```python
# Set tenant context before queries
async def set_tenant_context(db: AsyncSession, user_id: UUID, tenant_id: UUID):
    await db.execute(text(f"SET app.current_user_id = '{user_id}'"))
    await db.execute(text(f"SET app.current_tenant_id = '{tenant_id}'"))

# Middleware to set context
@app.middleware("http")
async def tenant_context_middleware(request: Request, call_next):
    user = request.state.user  # From JWT
    async with get_db() as db:
        await set_tenant_context(db, user.id, user.tenant_id)
        response = await call_next(request)
    return response
```

**Alternatives Considered**:
- Application-level filtering: Rejected due to risk of bugs
- Separate databases per tenant: Rejected due to operational complexity
- Schema-based isolation: Rejected due to migration complexity

**Testing Strategy**:
- Create 3 test tenants with sample data
- Verify User A cannot query User B's data
- Verify cross-tenant JOIN queries fail
- Verify admin bypass (if needed) works correctly

---

## 9. Subscription Trial Configuration

**Decision**: Admin-configurable trial duration (7/14/21/30 days) and limits per role

**Rationale**:
- Different roles may need different trial periods
- Marketing campaigns may require temporary trial extensions
- A/B testing trial durations to optimize conversion

**Implementation Approach**:

```python
# Subscription plan model
class SubscriptionPlan(BaseModel):
    plan_id: UUID
    role_id: UUID
    tier: Literal['basic', 'pro', 'premium']
    trial_duration_days: int = 14  # Configurable
    trial_documents_limit: int = 10
    trial_queries_limit: int = 50
    monthly_price: Decimal
    # ... other fields

# Admin API to update trial settings
@router.patch("/admin/roles/{role_id}/trial")
async def update_trial_settings(
    role_id: UUID,
    duration_days: int,
    documents_limit: int,
    queries_limit: int,
    db: AsyncSession = Depends(get_db)
):
    # Update trial settings for role
    # Only affects new signups, existing trials unchanged
    pass
```

**Trial Activation**:
- Triggered immediately after email/phone/OAuth verification
- Trial end date calculated: `signup_date + trial_duration_days`
- Usage limits enforced: documents_used < trial_documents_limit

**Alternatives Considered**:
- Fixed 14-day trial: Rejected due to lack of flexibility
- Unlimited trial: Rejected due to abuse risk
- Credit-based trial: Rejected due to complexity

---

## 10. Data Retention Policy

**Decision**: 30-day retention after subscription cancellation, then permanent deletion

**Rationale**:
- 30 days: Sufficient grace period for users to reconsider
- Permanent deletion: Reduces storage costs and compliance risk
- No export option: Simplifies implementation (can be added later if needed)

**Implementation Approach**:

```python
# Scheduled job (runs daily)
async def cleanup_expired_data():
    cutoff_date = datetime.utcnow() - timedelta(days=30)

    # Find cancelled subscriptions older than 30 days
    expired_users = await db.execute(
        select(User).where(
            User.subscription_status == 'cancelled',
            User.subscription_end_date < cutoff_date
        )
    )

    for user in expired_users:
        # Delete user data
        await db.execute(delete(GeneratedDocument).where(GeneratedDocument.user_id == user.id))
        await db.execute(delete(ChatSession).where(ChatSession.user_id == user.id))
        await db.execute(delete(ExamAttempt).where(ExamAttempt.user_id == user.id))

        # Mark user as deleted
        user.account_status = 'deleted'
        user.email = None  # Anonymize
        user.phone_number = None

        logger.info(f"Deleted data for user {user.id} (cancelled {user.subscription_end_date})")
```

**Alternatives Considered**:
- 90-day retention: Rejected due to higher storage costs
- Immediate deletion: Rejected due to user complaints risk
- Soft delete (indefinite): Rejected due to storage costs

---

## Summary of Decisions

| Area | Decision | Rationale |
|------|----------|-----------|
| AI Failover | Gemini primary, OpenAI backup | Service continuity, <5% failover rate |
| Authentication | Email/Phone/Google OAuth (user chooses) | Flexibility, payment gateway compatibility |
| Query Caching | Redis with 7-day TTL | 40% cost reduction, <1ms lookup |
| Payments | Stripe + JazzCash + EasyPaisa | Multiple options increase conversion |
| Scaling | Kubernetes HPA (3-10 pods) | Dynamic scaling, cost-effective |
| Alerting | Email + Slack webhook | Reliable + real-time |
| Chunking | 512 tokens, 50 overlap | Optimal semantic coherence |
| RLS | PostgreSQL native policies | Defense-in-depth security |
| Trial Config | Admin-configurable per role | Marketing flexibility |
| Data Retention | 30 days, then permanent delete | Balance grace period and cost |

**Next Steps**: Proceed to Phase 1 (Data Model & Contracts)
