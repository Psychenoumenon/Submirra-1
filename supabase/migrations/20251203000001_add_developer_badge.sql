/*
  # Add Developer Badge
  
  This migration adds a developer badge feature to user profiles.
  
  1. Changes to profiles table
    - Add `is_developer` boolean column (default false)
    
  2. Set specific users as developers
    - ded2c1c6-7064-499f-a1e7-a8f90c95904a
    - 4e319154-a316-4367-b8d6-d7776cef9d70
    - cf059e97-ae1c-40a9-88f2-ae0734fb1cdf
*/

-- Add is_developer column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_developer'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_developer boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_is_developer ON profiles(is_developer) WHERE is_developer = true;

-- Set the specified users as developers
UPDATE profiles
SET is_developer = true
WHERE id IN (
  'ded2c1c6-7064-499f-a1e7-a8f90c95904a',
  '4e319154-a316-4367-b8d6-d7776cef9d70',
  'cf059e97-ae1c-40a9-88f2-ae0734fb1cdf'
);

