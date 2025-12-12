-- Add signup_ip column to profiles table for IP-based duplicate account prevention
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS signup_ip TEXT;

-- Create index for faster IP lookups
CREATE INDEX IF NOT EXISTS idx_profiles_signup_ip ON profiles(signup_ip);

-- Add comment
COMMENT ON COLUMN profiles.signup_ip IS 'IP address used during signup to prevent multiple accounts from same device';
