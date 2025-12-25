/*
  # Remove Email from Profiles Table
  
  This migration removes the email column from the profiles table
  as email should not be stored in the profiles table.
  Email is already available in auth.users table.
*/

-- First, make email nullable if it's NOT NULL (to avoid constraint errors)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE profiles ALTER COLUMN email DROP NOT NULL;
  END IF;
END $$;

-- Remove email column from profiles table if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE profiles DROP COLUMN email;
  END IF;
END $$;

-- Update the handle_new_user function to not insert email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'username', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

