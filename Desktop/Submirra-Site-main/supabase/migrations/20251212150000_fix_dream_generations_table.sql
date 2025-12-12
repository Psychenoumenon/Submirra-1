-- Fix dream_generations table - copy data from result_image_url to generated_image_url
-- Check if result_image_url exists and copy data
DO $$
BEGIN
  -- If result_image_url exists, copy its data to generated_image_url
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dream_generations' 
    AND column_name = 'result_image_url'
  ) THEN
    -- Copy data from result_image_url to generated_image_url
    UPDATE public.dream_generations 
    SET generated_image_url = result_image_url 
    WHERE result_image_url IS NOT NULL 
      AND (generated_image_url IS NULL OR generated_image_url = '');
    
    -- Drop the old column
    ALTER TABLE public.dream_generations DROP COLUMN result_image_url;
  END IF;
END $$;

-- Ensure generated_image_url column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dream_generations' 
    AND column_name = 'generated_image_url'
  ) THEN
    ALTER TABLE public.dream_generations 
    ADD COLUMN generated_image_url TEXT;
  END IF;
END $$;

-- Add updated_at if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dream_generations' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.dream_generations 
    ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_dream_generations_user_id ON public.dream_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_dream_generations_created_at ON public.dream_generations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dream_generations_status ON public.dream_generations(status);
CREATE INDEX IF NOT EXISTS idx_dream_generations_is_public ON public.dream_generations(is_public) WHERE is_public = true;

-- Enable RLS
ALTER TABLE public.dream_generations ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies
DROP POLICY IF EXISTS "Users can view own generations" ON public.dream_generations;
DROP POLICY IF EXISTS "Users can view public generations" ON public.dream_generations;
DROP POLICY IF EXISTS "Users can insert own generations" ON public.dream_generations;
DROP POLICY IF EXISTS "Users can update own generations" ON public.dream_generations;
DROP POLICY IF EXISTS "Users can delete own generations" ON public.dream_generations;

-- RLS Policies
CREATE POLICY "Users can view own generations"
  ON public.dream_generations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view public generations"
  ON public.dream_generations
  FOR SELECT
  TO authenticated, anon
  USING (is_public = true);

CREATE POLICY "Users can insert own generations"
  ON public.dream_generations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own generations"
  ON public.dream_generations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own generations"
  ON public.dream_generations
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_dream_generations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS dream_generations_updated_at ON public.dream_generations;
CREATE TRIGGER dream_generations_updated_at
  BEFORE UPDATE ON public.dream_generations
  FOR EACH ROW
  EXECUTE FUNCTION update_dream_generations_updated_at();

-- Enable realtime for the table
ALTER TABLE public.dream_generations REPLICA IDENTITY FULL;

-- Grant necessary permissions for realtime
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dream_generations TO authenticated;
GRANT SELECT ON public.dream_generations TO anon;
