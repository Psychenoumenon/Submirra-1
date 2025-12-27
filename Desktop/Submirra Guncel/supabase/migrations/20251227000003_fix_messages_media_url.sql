-- ===========================================
-- FIX: Add missing media_url column to messages table
-- This column is required by a trigger but was missing
-- ===========================================

-- Add media_url column if not exists
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS media_url TEXT;

-- Also ensure video_url and image_url exist (for consistency)
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE messages
ADD COLUMN IF NOT EXISTS video_url TEXT;

ALTER TABLE messages
ADD COLUMN IF NOT EXISTS audio_url TEXT;
