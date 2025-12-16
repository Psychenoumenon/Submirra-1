-- Dream Generations Table (AI Generated Images for Premium Users)
-- Run this migration in Supabase SQL Editor

-- Create dream_generations table
CREATE TABLE IF NOT EXISTS dream_generations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  source_image_url TEXT NOT NULL,
  generated_image_url TEXT NOT NULL,
  prompt TEXT NOT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_dream_generations_user_id ON dream_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_dream_generations_is_public ON dream_generations(is_public);
CREATE INDEX IF NOT EXISTS idx_dream_generations_created_at ON dream_generations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dream_generations_user_public ON dream_generations(user_id, is_public);

-- Enable Row Level Security
ALTER TABLE dream_generations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Users can view own generations" ON dream_generations;
DROP POLICY IF EXISTS "Users can insert own generations" ON dream_generations;
DROP POLICY IF EXISTS "Users can update own generations" ON dream_generations;
DROP POLICY IF EXISTS "Users can delete own generations" ON dream_generations;
DROP POLICY IF EXISTS "Public generations are viewable by all" ON dream_generations;

-- RLS Policies

-- 1. Users can view their own generations
CREATE POLICY "Users can view own generations"
  ON dream_generations FOR SELECT
  USING (auth.uid() = user_id);

-- 2. Users can insert their own generations
CREATE POLICY "Users can insert own generations"
  ON dream_generations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3. Users can update their own generations
CREATE POLICY "Users can update own generations"
  ON dream_generations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Users can delete their own generations
CREATE POLICY "Users can delete own generations"
  ON dream_generations FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Everyone can view public generations
CREATE POLICY "Public generations are viewable by all"
  ON dream_generations FOR SELECT
  USING (is_public = true);

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON dream_generations TO authenticated;
GRANT SELECT ON dream_generations TO anon;

-- Add comment to table
COMMENT ON TABLE dream_generations IS 'AI-generated images created by premium users from their dream images';
COMMENT ON COLUMN dream_generations.source_image_url IS 'Original dream image URL used as source';
COMMENT ON COLUMN dream_generations.generated_image_url IS 'AI-generated image URL (from Leonardo AI)';
COMMENT ON COLUMN dream_generations.prompt IS 'User prompt describing the transformation';
COMMENT ON COLUMN dream_generations.is_public IS 'Whether this generation is visible on social feed';
