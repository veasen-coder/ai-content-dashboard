-- Migration: Add AI summary column to clients + demo_scripts table
-- Run this once in Supabase SQL Editor

-- 1. Add ai_summary column to clients (nullable)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS ai_summary TEXT;

-- 2. Create demo_scripts table
CREATE TABLE IF NOT EXISTS demo_scripts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  duration_minutes INTEGER DEFAULT 30,
  focus TEXT,
  tone TEXT,
  content JSONB NOT NULL,
  generated_via TEXT CHECK (generated_via IN ('api', 'paste_bridge')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Index for fast lookup by client
CREATE INDEX IF NOT EXISTS idx_demo_scripts_client_id
  ON demo_scripts (client_id);

-- 4. RLS: allow all authenticated users (single-user app for now)
ALTER TABLE demo_scripts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "demo_scripts_all_authenticated" ON demo_scripts;
CREATE POLICY "demo_scripts_all_authenticated" ON demo_scripts
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
