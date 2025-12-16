/*
  # Add Subscription System

  1. New Tables
    - `subscriptions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `status` (text) - active, trial, expired, cancelled
      - `trial_start_date` (timestamptz)
      - `trial_end_date` (timestamptz)
      - `trial_analyses_used` (integer) - default 0
      - `subscription_start_date` (timestamptz)
      - `subscription_end_date` (timestamptz)
      - `stripe_customer_id` (text)
      - `stripe_subscription_id` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `daily_limits`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `date` (date)
      - `analyses_used` (integer) - default 0
      - `analyses_limit` (integer) - default 3
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on both tables
    - Users can only read/update their own data
    
  3. Changes
    - Add RLS policies for secure access
    - Add indexes for performance
*/

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'trial',
  trial_start_date timestamptz,
  trial_end_date timestamptz,
  trial_analyses_used integer DEFAULT 0,
  subscription_start_date timestamptz,
  subscription_end_date timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('trial', 'active', 'expired', 'cancelled'))
);

-- Create daily_limits table
CREATE TABLE IF NOT EXISTS daily_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  analyses_used integer DEFAULT 0,
  analyses_limit integer DEFAULT 3,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_limits ENABLE ROW LEVEL SECURITY;

-- Subscriptions policies (drop if exists first to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own subscription" ON subscriptions;
CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own subscription" ON subscriptions;
CREATE POLICY "Users can update own subscription"
  ON subscriptions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own subscription" ON subscriptions;
CREATE POLICY "Users can insert own subscription"
  ON subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Daily limits policies (drop if exists first to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own daily limits" ON daily_limits;
CREATE POLICY "Users can view own daily limits"
  ON daily_limits FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own daily limits" ON daily_limits;
CREATE POLICY "Users can update own daily limits"
  ON daily_limits FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own daily limits" ON daily_limits;
CREATE POLICY "Users can insert own daily limits"
  ON daily_limits FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON subscriptions(status);
CREATE INDEX IF NOT EXISTS daily_limits_user_id_date_idx ON daily_limits(user_id, date);

-- Function to automatically create trial subscription on user signup
CREATE OR REPLACE FUNCTION create_trial_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO subscriptions (
    user_id,
    status,
    trial_start_date,
    trial_end_date,
    trial_analyses_used
  ) VALUES (
    NEW.id,
    'trial',
    now(),
    now() + interval '5 days',
    0
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create subscription on profile creation
DROP TRIGGER IF EXISTS create_subscription_on_signup ON profiles;
CREATE TRIGGER create_subscription_on_signup
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_trial_subscription();
