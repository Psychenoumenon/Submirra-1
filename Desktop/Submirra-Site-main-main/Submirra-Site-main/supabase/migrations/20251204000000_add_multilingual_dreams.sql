/*
  # Add Multilingual Support for Dreams
  
  1. Add multilingual columns to dreams table (dream_text_tr, dream_text_en, analysis_text_tr, analysis_text_en)
  2. Migrate existing data to both languages (assuming Turkish for existing data)
  3. Keep backward compatibility with original columns
*/

-- Add multilingual columns for dream text
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dreams' AND column_name = 'dream_text_tr'
  ) THEN
    ALTER TABLE dreams ADD COLUMN dream_text_tr text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dreams' AND column_name = 'dream_text_en'
  ) THEN
    ALTER TABLE dreams ADD COLUMN dream_text_en text;
  END IF;
END $$;

-- Add multilingual columns for analysis text
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dreams' AND column_name = 'analysis_text_tr'
  ) THEN
    ALTER TABLE dreams ADD COLUMN analysis_text_tr text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dreams' AND column_name = 'analysis_text_en'
  ) THEN
    ALTER TABLE dreams ADD COLUMN analysis_text_en text;
  END IF;
END $$;

-- Migrate existing data: Copy existing dream_text and analysis_text to Turkish columns
-- (Assuming existing data is in Turkish)
UPDATE dreams
SET 
  dream_text_tr = COALESCE(dream_text_tr, dream_text),
  analysis_text_tr = COALESCE(analysis_text_tr, analysis_text)
WHERE dream_text_tr IS NULL OR analysis_text_tr IS NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_dreams_user_id_created_at ON dreams(user_id, created_at DESC);






