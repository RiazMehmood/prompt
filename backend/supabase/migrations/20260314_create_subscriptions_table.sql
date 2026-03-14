-- Migration: Create subscriptions table
-- Created: 2026-03-14

CREATE TABLE IF NOT EXISTS subscriptions (
    subscription_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'cancelled', 'expired')),
    trial_end TIMESTAMP WITH TIME ZONE,
    document_limit INTEGER DEFAULT 10,
    documents_used INTEGER DEFAULT 0,
    features JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
