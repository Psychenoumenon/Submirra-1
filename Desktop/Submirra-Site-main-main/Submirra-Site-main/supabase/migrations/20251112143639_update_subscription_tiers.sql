/*
  # Update Subscription Tiers

  1. Changes to subscriptions table
    - Add `plan_type` column (trial, standard, premium)
    - Add `monthly_library_limit` column for standard plan (90 analyses per month)
    - Add `daily_analysis_limit` column (3 for trial/standard, 10 for premium)
    - Add `visualizations_per_analysis` column (1 for standard, 3 for premium)
    
  2. Changes to daily_limits table
    - Update to support different daily limits based on plan
    
  3. New table: library_items
    - Track saved dream analyses
    - Support monthly clearing for standard plans
    - Unlimited for premium plans
    
  4. Security
    - All tables have RLS enabled
    - Users can only access their own data
*/

-- Add new columns to subscriptions table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'plan_type'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN plan_type text DEFAULT 'trial';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'monthly_library_limit'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN monthly_library_limit integer DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'daily_analysis_limit'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN daily_analysis_limit integer DEFAULT 3;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'visualizations_per_analysis'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN visualizations_per_analysis integer DEFAULT 1;
  END IF;
END $$;

-- Add constraint for plan_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_plan_type_check'
  ) THEN
    ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_type_check 
      CHECK (plan_type IN ('trial', 'standard', 'premium'));
  END IF;
END $$;

-- Update existing subscriptions to have plan details
UPDATE subscriptions
SET 
  plan_type = CASE 
    WHEN status = 'trial' THEN 'trial'
    ELSE 'standard'
  END,
  daily_analysis_limit = 3,
  visualizations_per_analysis = 1,
  monthly_library_limit = CASE 
    WHEN status = 'trial' THEN NULL
    ELSE 90
  END
WHERE plan_type IS NULL;

-- Create library_items table if not exists
CREATE TABLE IF NOT EXISTS library_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  dream_id uuid REFERENCES dreams(id) ON DELETE CASCADE NOT NULL,
  saved_at timestamptz DEFAULT now(),
  month_year text DEFAULT to_char(now(), 'YYYY-MM'),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, dream_id)
);

-- Enable RLS on library_items
ALTER TABLE library_items ENABLE ROW LEVEL SECURITY;

-- Library items policies (drop if exists first to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own library items" ON library_items;
CREATE POLICY "Users can view own library items"
  ON library_items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own library items" ON library_items;
CREATE POLICY "Users can insert own library items"
  ON library_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own library items" ON library_items;
CREATE POLICY "Users can delete own library items"
  ON library_items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX IF NOT EXISTS library_items_user_id_idx ON library_items(user_id);
CREATE INDEX IF NOT EXISTS library_items_month_year_idx ON library_items(month_year);

-- Function to update subscription plan details
CREATE OR REPLACE FUNCTION update_subscription_plan(
  p_user_id uuid,
  p_plan_type text
)
RETURNS void AS $$
BEGIN
  UPDATE subscriptions
  SET 
    plan_type = p_plan_type,
    daily_analysis_limit = CASE 
      WHEN p_plan_type = 'trial' THEN 5
      WHEN p_plan_type = 'standard' THEN 3
      WHEN p_plan_type = 'premium' THEN 10
    END,
    visualizations_per_analysis = CASE 
      WHEN p_plan_type = 'trial' THEN 1
      WHEN p_plan_type = 'standard' THEN 1
      WHEN p_plan_type = 'premium' THEN 3
    END,
    monthly_library_limit = CASE 
      WHEN p_plan_type = 'trial' THEN NULL
      WHEN p_plan_type = 'standard' THEN 90
      WHEN p_plan_type = 'premium' THEN NULL
    END,
    status = CASE 
      WHEN p_plan_type = 'trial' THEN 'trial'
      ELSE 'active'
    END,
    subscription_start_date = CASE 
      WHEN p_plan_type IN ('standard', 'premium') THEN now()
      ELSE subscription_start_date
    END,
    updated_at = now()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check library limit
CREATE OR REPLACE FUNCTION check_library_limit(p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  v_limit integer;
  v_count integer;
  v_current_month text;
BEGIN
  v_current_month := to_char(now(), 'YYYY-MM');
  
  SELECT monthly_library_limit INTO v_limit
  FROM subscriptions
  WHERE user_id = p_user_id;
  
  IF v_limit IS NULL THEN
    RETURN true;
  END IF;
  
  SELECT COUNT(*) INTO v_count
  FROM library_items
  WHERE user_id = p_user_id 
    AND month_year = v_current_month;
  
  RETURN v_count < v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clear monthly library for standard users
CREATE OR REPLACE FUNCTION clear_monthly_libraries()
RETURNS void AS $$
DECLARE
  v_last_month text;
BEGIN
  v_last_month := to_char(now() - interval '1 month', 'YYYY-MM');
  
  DELETE FROM library_items
  WHERE user_id IN (
    SELECT user_id 
    FROM subscriptions 
    WHERE plan_type = 'standard'
  )
  AND month_year = v_last_month;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
