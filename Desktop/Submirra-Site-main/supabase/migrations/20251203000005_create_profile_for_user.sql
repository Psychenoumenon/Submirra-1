/*
  # Create Profile for Specific User UUID
  
  This migration creates a profile for the user with UUID: cf059e97-ae1c-40a9-88f2-ae0734fb1cdf
  
  Note: This assumes the user already exists in auth.users table.
  If the user doesn't exist in auth.users, this will fail.
  The user should be created through Supabase Auth API first.
*/

-- Create profile for the specified user if it doesn't exist
-- This will only work if the user exists in auth.users table
INSERT INTO profiles (
  id,
  email,
  full_name,
  username,
  created_at,
  updated_at
)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', ''),
  COALESCE(raw_user_meta_data->>'username', NULL),
  created_at,
  updated_at
FROM auth.users
WHERE id = 'cf059e97-ae1c-40a9-88f2-ae0734fb1cdf'
  AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = 'cf059e97-ae1c-40a9-88f2-ae0734fb1cdf'
  )
ON CONFLICT (id) DO NOTHING;

-- If the user doesn't exist in auth.users, create a minimal profile entry
-- This is a fallback, but the user should ideally be created through Auth API
DO $$
BEGIN
  -- Check if profile exists, if not and user doesn't exist in auth.users, create minimal profile
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = 'cf059e97-ae1c-40a9-88f2-ae0734fb1cdf'
  ) AND NOT EXISTS (
    SELECT 1 FROM auth.users WHERE id = 'cf059e97-ae1c-40a9-88f2-ae0734fb1cdf'
  ) THEN
    -- Create minimal profile (this will fail if foreign key constraint is enforced)
    -- In this case, user must be created through Supabase Auth API first
    RAISE NOTICE 'User with UUID cf059e97-ae1c-40a9-88f2-ae0734fb1cdf does not exist in auth.users. Please create the user through Supabase Auth API first.';
  END IF;
END $$;

