/*
  # Developer Permissions and Ban System
  
  This migration adds:
  1. Ban system for users (is_banned column in profiles)
  2. Developer permissions for unlimited analysis
  3. Developer ability to ban/unban users
  4. Developer ability to delete any dream from social feed
  
  Developer User IDs:
  - 4e319154-a316-4367-b8d6-d7776cef9d70
  - cf059e97-ae1c-40a9-88f2-ae0734fb1cdf
  - ded2c1c6-7064-499f-a1e7-a8f90c95904a
*/

-- Add is_banned column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_banned'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_banned boolean DEFAULT false NOT NULL;
    ALTER TABLE profiles ADD COLUMN banned_at timestamptz;
    ALTER TABLE profiles ADD COLUMN banned_by uuid REFERENCES profiles(id);
    ALTER TABLE profiles ADD COLUMN ban_reason text;
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_is_banned ON profiles(is_banned) WHERE is_banned = true;

-- Function to check if user is developer
CREATE OR REPLACE FUNCTION is_developer(p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_user_id AND is_developer = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to ban a user (only developers can use this)
CREATE OR REPLACE FUNCTION ban_user(
  p_developer_id uuid,
  p_user_id_to_ban uuid,
  p_reason text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Check if the caller is a developer
  IF NOT is_developer(p_developer_id) THEN
    RAISE EXCEPTION 'Only developers can ban users';
  END IF;
  
  -- Prevent developers from banning themselves
  IF p_developer_id = p_user_id_to_ban THEN
    RAISE EXCEPTION 'Developers cannot ban themselves';
  END IF;
  
  -- Prevent developers from banning other developers
  IF is_developer(p_user_id_to_ban) THEN
    RAISE EXCEPTION 'Developers cannot ban other developers';
  END IF;
  
  -- Ban the user
  UPDATE profiles
  SET 
    is_banned = true,
    banned_at = now(),
    banned_by = p_developer_id,
    ban_reason = p_reason
  WHERE id = p_user_id_to_ban;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unban a user (only developers can use this)
CREATE OR REPLACE FUNCTION unban_user(
  p_developer_id uuid,
  p_user_id_to_unban uuid
)
RETURNS void AS $$
BEGIN
  -- Check if the caller is a developer
  IF NOT is_developer(p_developer_id) THEN
    RAISE EXCEPTION 'Only developers can unban users';
  END IF;
  
  -- Unban the user
  UPDATE profiles
  SET 
    is_banned = false,
    banned_at = NULL,
    banned_by = NULL,
    ban_reason = NULL
  WHERE id = p_user_id_to_unban;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can analyze (bypasses limits for developers)
CREATE OR REPLACE FUNCTION can_user_analyze(p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  v_is_developer boolean;
  v_is_banned boolean;
BEGIN
  -- Check if user is banned
  SELECT is_banned INTO v_is_banned
  FROM profiles
  WHERE id = p_user_id;
  
  IF v_is_banned = true THEN
    RETURN false;
  END IF;
  
  -- Check if user is developer (developers have unlimited analysis)
  SELECT is_developer INTO v_is_developer
  FROM profiles
  WHERE id = p_user_id;
  
  IF v_is_developer = true THEN
    RETURN true;
  END IF;
  
  -- For regular users, check existing limits
  -- This function will be called in addition to existing limit checks
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;



