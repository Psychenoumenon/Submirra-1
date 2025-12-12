/*
  # Fix Trial Columns in Profiles Table
  
  This migration ensures trial columns exist and refreshes the schema cache
*/

-- Add trial columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'trial_start'
  ) THEN
    ALTER TABLE profiles ADD COLUMN trial_start TIMESTAMP WITH TIME ZONE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'trial_end'
  ) THEN
    ALTER TABLE profiles ADD COLUMN trial_end TIMESTAMP WITH TIME ZONE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'trial_used'
  ) THEN
    ALTER TABLE profiles ADD COLUMN trial_used BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';


