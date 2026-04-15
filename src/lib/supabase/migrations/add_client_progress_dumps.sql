-- Migration: Link image_dumps to clients for per-client progress updates
-- Run this once in Supabase SQL Editor

-- 1. Add client_id column (nullable — global dumps stay NULL)
ALTER TABLE image_dumps
  ADD COLUMN IF NOT EXISTS client_id UUID
  REFERENCES clients(id) ON DELETE CASCADE;

-- 2. Index for fast lookup by client
CREATE INDEX IF NOT EXISTS idx_image_dumps_client_id
  ON image_dumps (client_id)
  WHERE client_id IS NOT NULL;
