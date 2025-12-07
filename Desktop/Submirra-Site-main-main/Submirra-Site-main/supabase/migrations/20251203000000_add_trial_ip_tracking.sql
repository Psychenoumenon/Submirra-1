/*
  # Add Trial IP Tracking
  
  This migration creates a table to track trial activations by IP address
  to prevent users from creating multiple accounts to get multiple free trials.
  
  1. New Table
    - `trial_attempts`
      - `id` (uuid, primary key)
      - `ip_address` (text) - IP address of the user
      - `user_id` (uuid, foreign key) - User who activated trial
      - `created_at` (timestamptz) - When trial was activated
      
  2. Security
    - Enable RLS on the table
    - Users can only view their own attempts
    - Only service role can insert (via RPC function)
    
  3. Function
    - `check_ip_trial_eligibility(p_ip_address text)` - Check if IP has used trial before
    - `record_trial_activation(p_ip_address text, p_user_id uuid)` - Record trial activation
*/

-- Create trial_attempts table
CREATE TABLE IF NOT EXISTS trial_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create index on ip_address for fast lookups
CREATE INDEX IF NOT EXISTS idx_trial_attempts_ip_address ON trial_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_trial_attempts_user_id ON trial_attempts(user_id);

-- Enable RLS
ALTER TABLE trial_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own trial attempts
CREATE POLICY "Users can view their own trial attempts"
  ON trial_attempts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Function to check if IP address has already used a trial
CREATE OR REPLACE FUNCTION check_ip_trial_eligibility(p_ip_address text)
RETURNS boolean AS $$
DECLARE
  v_count integer;
BEGIN
  -- Check if this IP address has already activated a trial
  SELECT COUNT(*) INTO v_count
  FROM trial_attempts
  WHERE ip_address = p_ip_address;
  
  -- Return true if no previous attempts (eligible), false if already used
  RETURN v_count = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record a trial activation
CREATE OR REPLACE FUNCTION record_trial_activation(p_ip_address text, p_user_id uuid)
RETURNS void AS $$
BEGIN
  -- Insert the trial attempt record
  INSERT INTO trial_attempts (ip_address, user_id)
  VALUES (p_ip_address, p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

