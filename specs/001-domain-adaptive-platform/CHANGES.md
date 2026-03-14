# Changes Summary - Domain-Adaptive Platform

**Date**: 2026-03-14
**Status**: Specification Updated

---

## Key Changes Made

### 1. Payment System - Fully Automated ✅

**REMOVED**: Manual bank transfer payments
**ADDED**: Automated card payments via Stripe

**Payment Methods (All Automated)**:
- ✅ JazzCash (mobile wallet with OTP)
- ✅ EasyPaisa (mobile wallet with OTP)
- ✅ Debit/Credit Card via Stripe (Visa, Mastercard, local Pakistani cards)

**Key Features**:
- PCI-DSS compliant card tokenization (never store raw card numbers)
- Real-time card validation (format, expiry, CVV)
- 3D Secure authentication for Pakistani cards
- Saved payment methods for one-click renewal
- Webhook verification for all payment methods (30-second activation)
- Automatic retry logic for failed payments (3 attempts over 7 days)

---

### 2. Free Trial - Flexible Configuration ✅

**Previous**: Fixed trial period
**Updated**: Admin-configurable trial settings

**Trial Configuration**:
- **Duration**: 7, 14, 21, or 30 days (admin selectable)
- **Default**: 14 days
- **Limits**: 10 documents, 50 queries (configurable per role)
- **Admin Control**: Can adjust trial duration and limits in real-time
- **Grandfathering**: Existing trial users keep their original duration when admin changes settings

**Example Use Cases**:
- Launch promotion: 30-day trial for first 100 users
- Teacher promotion: 21 days + 15 documents for back-to-school season
- Doctor trial: 14 days + 5 documents (higher value users)

---

### 3. Updated Functional Requirements

**New Requirements Added**:

- **FR-088**: Card payment support via Stripe with PCI-DSS tokenization
- **FR-089**: Real-time card validation (format, expiry, CVV)
- **FR-090**: Webhook delay handling (poll gateway for up to 10 minutes)
- **FR-091**: Specific error messages for card failures (insufficient funds, expired card, etc.)
- **FR-092**: Trial duration changes apply only to new signups
- **FR-093**: Secure payment method storage with tokenization

**Updated Requirements**:

- **FR-050**: Changed from "JazzCash, EasyPaisa, Bank Transfer" to "JazzCash, EasyPaisa, Card via Stripe"
- **FR-051**: Changed from "limited usage" to "configurable duration (7/14/21/30 days) and usage limits"
- **FR-056**: Added trial settings configuration (duration, limits) to admin pricing control

---

### 4. Updated Database Schema

**New Tables**:

**saved_payment_methods**
```sql
CREATE TABLE saved_payment_methods (
    payment_method_id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(user_id),
    method_type VARCHAR(20), -- 'card', 'jazzcash', 'easypaisa'
    card_token VARCHAR(255), -- Tokenized, never raw card number
    card_last_four VARCHAR(4),
    card_brand VARCHAR(20), -- 'Visa', 'Mastercard'
    card_expiry_month INT,
    card_expiry_year INT,
    mobile_number VARCHAR(20), -- For JazzCash/EasyPaisa
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP,
    last_used_at TIMESTAMP
);
```

**Updated Tables**:

**subscription_plans** - Added trial configuration:
```sql
ALTER TABLE subscription_plans ADD COLUMN trial_duration_days INT DEFAULT 14;
ALTER TABLE subscription_plans ADD COLUMN trial_documents_limit INT DEFAULT 10;
ALTER TABLE subscription_plans ADD COLUMN trial_queries_limit INT DEFAULT 50;
```

**payment_transactions** - Added card payment fields:
```sql
ALTER TABLE payment_transactions ADD COLUMN payment_gateway VARCHAR(50);
ALTER TABLE payment_transactions ADD COLUMN card_last_four VARCHAR(4);
ALTER TABLE payment_transactions ADD COLUMN card_brand VARCHAR(20);
ALTER TABLE payment_transactions ADD COLUMN failure_reason TEXT;
```

**pricing_history** - Added trial settings tracking:
```sql
ALTER TABLE pricing_history ADD COLUMN old_trial_settings JSONB;
ALTER TABLE pricing_history ADD COLUMN new_trial_settings JSONB;
```

---

### 5. Updated User Stories

**User Story 2** - Updated payment flow:
- Changed from "JazzCash, EasyPaisa, Bank Transfer" to "JazzCash, EasyPaisa, Debit/Credit Card"
- Added card payment scenario with secure form and immediate activation
- Updated acceptance scenarios to include card validation and webhook handling

**User Story 7** - Updated admin pricing control:
- Added trial duration configuration (7/14/21/30 days)
- Added trial limits configuration (documents, queries)
- Updated acceptance scenarios to include trial settings management

---

### 6. Updated Edge Cases

**New Edge Cases Added**:

1. **Card payment declined**: Display specific error from gateway (insufficient funds, expired card, invalid CVV)
2. **Invalid card details**: Real-time validation before submission
3. **Webhook delays**: Poll gateway status for up to 10 minutes
4. **Trial duration changes**: Apply only to new signups, preserve existing users' duration

---

### 7. Updated Assumptions

**Removed**:
- ❌ Bank transfer is acceptable for payments

**Added**:
- ✅ Stripe supports PKR currency or users accept USD equivalent
- ✅ PCI-DSS compliance handled by Stripe (not application)
- ✅ Users prefer automated online payments over manual bank transfers

---

### 8. Updated Out of Scope

**Added**:
- ❌ Manual bank transfer payments (all payments must be automated)

---

## Technical Implementation Notes

### Stripe Integration

**Setup Required**:
1. Create Stripe account (supports Pakistan)
2. Enable PKR currency (or use USD with conversion)
3. Configure webhook endpoints:
   - `payment_intent.succeeded`
   - `payment_intent.failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Set up Stripe Checkout for card payments
5. Implement card tokenization for saved payment methods

**Security**:
- Never store raw card numbers (use Stripe tokens)
- Use Stripe.js for client-side card validation
- Implement 3D Secure (SCA) for Pakistani cards
- Validate webhook signatures to prevent fraud

**Cost**:
- Stripe fee: 2.9% + PKR 15 per transaction (international cards)
- Local Pakistani cards: Lower fees (check Stripe Pakistan pricing)

### Admin Dashboard Updates

**New Features Required**:

1. **Trial Settings Management**:
   - Dropdown: Select trial duration (7/14/21/30 days)
   - Input fields: Documents limit, Queries limit
   - Apply per role or globally
   - Preview: "New users will get X days with Y documents"

2. **Payment Method Management**:
   - View all payment transactions
   - Filter by gateway (JazzCash, EasyPaisa, Stripe)
   - View failed payments with reasons
   - Manual refund processing

3. **Saved Payment Methods**:
   - Users can view/delete saved cards
   - Display: "Visa ending in 4242, expires 12/2027"
   - Set default payment method

---

## Migration Path

### For Existing Users (If Any)

1. **No impact**: All changes are for new signups
2. **Existing trials**: Keep original duration
3. **Existing subscriptions**: Continue with current payment method
4. **New renewals**: Can choose card payment option

### For Development

1. **Phase 1**: Implement Stripe integration (2 weeks)
2. **Phase 2**: Add trial configuration UI (1 week)
3. **Phase 3**: Update payment flow UI (1 week)
4. **Phase 4**: Testing with test cards (1 week)
5. **Phase 5**: Production deployment with monitoring

---

## Testing Checklist

### Payment Testing

- [ ] JazzCash payment successful
- [ ] EasyPaisa payment successful
- [ ] Stripe card payment successful (Visa)
- [ ] Stripe card payment successful (Mastercard)
- [ ] Card payment declined (insufficient funds)
- [ ] Card payment declined (expired card)
- [ ] Invalid card number validation
- [ ] Invalid CVV validation
- [ ] Expired card validation
- [ ] 3D Secure authentication flow
- [ ] Webhook received within 30 seconds
- [ ] Webhook delayed (poll gateway)
- [ ] Webhook signature validation
- [ ] Failed payment retry logic (3 attempts)
- [ ] Saved payment method (card tokenization)
- [ ] One-click renewal with saved card

### Trial Configuration Testing

- [ ] Admin sets trial to 7 days
- [ ] Admin sets trial to 14 days
- [ ] Admin sets trial to 21 days
- [ ] Admin sets trial to 30 days
- [ ] Admin changes document limit to 15
- [ ] Admin changes query limit to 100
- [ ] New user gets updated trial settings
- [ ] Existing trial user keeps original duration
- [ ] Trial expiry warning at 80% usage
- [ ] Trial expiry blocks access
- [ ] Trial to paid conversion flow

---

## Cost Impact

### Additional Costs

**Stripe Fees**:
- Per transaction: 2.9% + PKR 15
- Example: PKR 800 subscription = PKR 23.2 + PKR 15 = PKR 38.2 fee (4.8%)
- Monthly (1000 users, 50% card payments): ~PKR 19,000 ($68 USD)

**Total Infrastructure** (Updated):
- DigitalOcean: $119/month
- Gemini API: $150/month
- Supabase: $25/month
- Stripe fees: $68/month
- **Total**: $362/month (was $296/month)

**Revenue Impact**: Minimal (4.8% fee absorbed or passed to users)

---

## Next Steps

1. ✅ **Specification Complete** - All changes documented
2. ⏳ **Create plan.md** - Detailed implementation architecture
3. ⏳ **Create tasks.md** - Actionable development tasks
4. ⏳ **Set up Stripe account** - Enable PKR, configure webhooks
5. ⏳ **Implement payment integration** - Backend + Frontend
6. ⏳ **Implement trial configuration** - Admin dashboard
7. ⏳ **Testing** - All payment methods and trial scenarios
8. ⏳ **Production deployment** - With monitoring and alerts

---

## Questions Resolved

**Q1**: Do we need manual bank transfer?
**A1**: ❌ No, all payments must be automated online (JazzCash, EasyPaisa, Card)

**Q2**: Should trial duration be fixed?
**A2**: ❌ No, admin should be able to configure trial duration (7/14/21/30 days) and limits per role

**Q3**: How to handle card payments securely?
**A3**: ✅ Use Stripe with PCI-DSS compliant tokenization, never store raw card numbers

**Q4**: What if Stripe webhook is delayed?
**A4**: ✅ Poll gateway status every 30 seconds for up to 10 minutes before timeout

---

**Document Version**: 1.0
**Last Updated**: 2026-03-14
**Status**: Ready for Implementation Planning
