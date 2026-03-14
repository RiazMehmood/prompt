-- Combined Supabase Migrations for Checkpoint 1 MVP
-- Run this entire file in Supabase SQL Editor
-- URL: https://supabase.com/dashboard/project/ypxflnyritmmhszqfebr/sql

-- ============================================================
-- Migration 1: Core Tables (Users, Roles, Admins)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
    role_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    category VARCHAR(50) DEFAULT 'professional',
    ai_persona_prompt TEXT NOT NULL,
    sidebar_features JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    phone_number VARCHAR(20) UNIQUE,
    auth_method VARCHAR(20) NOT NULL CHECK (auth_method IN ('email', 'phone', 'google')),
    google_id VARCHAR(255) UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    role_id UUID NOT NULL REFERENCES roles(role_id) ON DELETE RESTRICT,
    account_status VARCHAR(20) DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'deleted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create admins table
CREATE TABLE IF NOT EXISTS admins (
    admin_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    admin_type VARCHAR(20) DEFAULT 'root' CHECK (admin_type IN ('root', 'domain', 'support')),
    permissions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_admins_user_id ON admins(user_id);

-- ============================================================
-- Migration 2: Subscriptions Table
-- ============================================================

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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- ============================================================
-- Migration 3: Documents and Chat Tables
-- ============================================================

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
    document_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100) DEFAULT 'legal',
    role_id UUID NOT NULL REFERENCES roles(role_id) ON DELETE RESTRICT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    file_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    embedding vector(768),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat_sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(role_id) ON DELETE RESTRICT,
    messages JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create generated_documents table
CREATE TABLE IF NOT EXISTS generated_documents (
    generated_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    file_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_documents_role_id ON documents(role_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_embedding ON documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_last_active ON chat_sessions(last_active);
CREATE INDEX IF NOT EXISTS idx_generated_documents_user_id ON generated_documents(user_id);

-- ============================================================
-- Migration 4: RLS Policies
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY IF NOT EXISTS "Users can view their own profile"
  ON users FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their own profile"
  ON users FOR UPDATE
  USING (auth.uid()::text = user_id);

-- Roles table policies (public read)
CREATE POLICY IF NOT EXISTS "Anyone can view roles"
  ON roles FOR SELECT
  TO authenticated
  USING (true);

-- Admins table policies
CREATE POLICY IF NOT EXISTS "Admins can view their own admin record"
  ON admins FOR SELECT
  USING (auth.uid()::text = user_id);

-- Subscriptions table policies
CREATE POLICY IF NOT EXISTS "Users can view their own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their own subscription"
  ON subscriptions FOR UPDATE
  USING (auth.uid()::text = user_id);

-- Documents table policies
CREATE POLICY IF NOT EXISTS "Users can view approved documents for their role"
  ON documents FOR SELECT
  USING (status = 'approved');

CREATE POLICY IF NOT EXISTS "Users can insert documents (pending approval)"
  ON documents FOR INSERT
  WITH CHECK (auth.uid()::text IS NOT NULL);

CREATE POLICY IF NOT EXISTS "Admins can update documents"
  ON documents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()::text
      AND admins.is_active = true
    )
  );

-- Chat sessions table policies
CREATE POLICY IF NOT EXISTS "Users can view their own chat sessions"
  ON chat_sessions FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert their own chat sessions"
  ON chat_sessions FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their own chat sessions"
  ON chat_sessions FOR UPDATE
  USING (auth.uid()::text = user_id);

-- Generated documents table policies
CREATE POLICY IF NOT EXISTS "Users can view their own generated documents"
  ON generated_documents FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert their own generated documents"
  ON generated_documents FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- ============================================================
-- Migration Complete!
-- ============================================================
-- Next step: Run the seed script to populate initial data
-- python3 backend/scripts/seed_data.py
