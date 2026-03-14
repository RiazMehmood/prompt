-- RLS Policies for Checkpoint 1 MVP
-- Run this in Supabase SQL Editor

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (auth.uid()::text = user_id);

-- Roles table policies (public read)
CREATE POLICY "Anyone can view roles"
  ON roles FOR SELECT
  TO authenticated
  USING (true);

-- Admins table policies
CREATE POLICY "Admins can view their own admin record"
  ON admins FOR SELECT
  USING (auth.uid()::text = user_id);

-- Subscriptions table policies
CREATE POLICY "Users can view their own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own subscription"
  ON subscriptions FOR UPDATE
  USING (auth.uid()::text = user_id);

-- Documents table policies
CREATE POLICY "Users can view approved documents for their role"
  ON documents FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Users can insert documents (pending approval)"
  ON documents FOR INSERT
  WITH CHECK (auth.uid()::text IS NOT NULL);

CREATE POLICY "Admins can update documents"
  ON documents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()::text
      AND admins.is_active = true
    )
  );

-- Chat sessions table policies
CREATE POLICY "Users can view their own chat sessions"
  ON chat_sessions FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own chat sessions"
  ON chat_sessions FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own chat sessions"
  ON chat_sessions FOR UPDATE
  USING (auth.uid()::text = user_id);

-- Generated documents table policies
CREATE POLICY "Users can view their own generated documents"
  ON generated_documents FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own generated documents"
  ON generated_documents FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);
