-- Migration: Create core tables for Checkpoint 1 MVP
-- Created: 2026-03-14

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
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_admins_user_id ON admins(user_id);
