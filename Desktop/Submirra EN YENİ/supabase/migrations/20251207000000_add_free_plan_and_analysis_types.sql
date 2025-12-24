/*
  # Add Free Plan and Analysis Types
  
  This migration adds:
  1. 'free' plan_type to subscriptions table
  2. 'analysis_type' column to dreams table (basic, advanced, visual)
  3. Updates all relevant functions and constraints
*/

-- 1. Update subscriptions table constraint to include 'free' plan_type
DO $$
BEGIN
  -- Drop existing constraint if it exists
  ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_type_check;
  
  -- Add new constraint with 'free' included
  ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_type_check 
    CHECK (plan_type IN ('free', 'trial', 'standard', 'premium'));
END $$;

-- 2. Add analysis_type column to dreams table
-- First, drop existing constraint if it exists (to update it with new values)
ALTER TABLE dreams DROP CONSTRAINT IF EXISTS dreams_analysis_type_check;

-- Add column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dreams' AND column_name = 'analysis_type'
  ) THEN
    ALTER TABLE dreams ADD COLUMN analysis_type text DEFAULT 'basic';
  END IF;
END $$;

-- Update existing rows to use new analysis_type values BEFORE adding constraint
-- Step 1: Set NULL values to 'basic'
UPDATE dreams SET analysis_type = 'basic' WHERE analysis_type IS NULL;

-- Step 2: Convert 'visual' values to 'advanced_visual' or 'basic_visual' based on images
UPDATE dreams
SET analysis_type = CASE 
  WHEN (image_url IS NOT NULL AND image_url != '') 
    OR (image_url_2 IS NOT NULL AND image_url_2 != '') 
    OR (image_url_3 IS NOT NULL AND image_url_3 != '') 
  THEN 'advanced_visual'
  ELSE 'basic_visual'
END
WHERE analysis_type = 'visual';

-- Step 3: Convert any other invalid values
UPDATE dreams
SET analysis_type = CASE 
  WHEN (image_url IS NOT NULL AND image_url != '') 
    OR (image_url_2 IS NOT NULL AND image_url_2 != '') 
    OR (image_url_3 IS NOT NULL AND image_url_3 != '') 
  THEN 'advanced_visual'
  ELSE 'advanced'
END
WHERE analysis_type NOT IN ('basic', 'advanced', 'basic_visual', 'advanced_visual');

-- Now add constraint for analysis_type values (with new values)
ALTER TABLE dreams ADD CONSTRAINT dreams_analysis_type_check 
  CHECK (analysis_type IN ('basic', 'advanced', 'basic_visual', 'advanced_visual'));

-- 3. Update auto_update_subscription_on_plan_type_change function to handle 'free' plan
CREATE OR REPLACE FUNCTION auto_update_subscription_on_plan_type_change()
RETURNS TRIGGER AS $$
BEGIN
  -- ÖNEMLİ: Türkçe "standart" yazılırsa otomatik olarak İngilizce "standard" yap
  IF NEW.plan_type = 'standart' THEN
    NEW.plan_type := 'standard';
  END IF;
  
  -- Eğer plan_type değiştiyse veya yeni kayıt oluşturuluyorsa, diğer alanları otomatik güncelle
  IF (TG_OP = 'INSERT') OR (NEW.plan_type IS DISTINCT FROM COALESCE(OLD.plan_type, '')) THEN
    NEW.daily_analysis_limit := CASE 
      WHEN NEW.plan_type = 'free' THEN NULL  -- Free plan: unlimited basic analyses
      WHEN NEW.plan_type = 'trial' THEN 5  -- Trial için toplam 5 (trial_analyses_used ile kontrol)
      WHEN NEW.plan_type = 'standard' THEN 3  -- Standard günlük 3
      WHEN NEW.plan_type = 'premium' THEN 5  -- Premium günlük 5
      ELSE COALESCE(NEW.daily_analysis_limit, 5)
    END;
    
    NEW.visualizations_per_analysis := CASE 
      WHEN NEW.plan_type = 'free' THEN 0  -- Free plan: no visualizations
      WHEN NEW.plan_type = 'trial' THEN 1
      WHEN NEW.plan_type = 'standard' THEN 1
      WHEN NEW.plan_type = 'premium' THEN 3
      ELSE COALESCE(NEW.visualizations_per_analysis, 1)
    END;
    
    NEW.monthly_library_limit := CASE 
      WHEN NEW.plan_type = 'free' THEN 30  -- Free plan: 30 dreams limit
      WHEN NEW.plan_type = 'trial' THEN NULL
      WHEN NEW.plan_type = 'standard' THEN 60  -- Updated from 90 to 60
      WHEN NEW.plan_type = 'premium' THEN 90
      ELSE NEW.monthly_library_limit
    END;
    
    -- Status'u güncelle (trial ise 'trial', değilse 'active')
    NEW.status := CASE 
      WHEN NEW.plan_type = 'trial' THEN 'trial'
      ELSE 'active'
    END;
    
    -- Standard veya premium ise subscription_start_date'i güncelle
    IF NEW.plan_type IN ('standard', 'premium') AND 
       (TG_OP = 'INSERT' OR OLD.plan_type NOT IN ('standard', 'premium')) THEN
      NEW.subscription_start_date := now();
    END IF;
    
    -- updated_at'i güncelle
    NEW.updated_at := now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Update update_subscription_plan function to handle 'free' plan
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
      WHEN p_plan_type = 'free' THEN NULL  -- Free plan: unlimited basic analyses
      WHEN p_plan_type = 'trial' THEN 5
      WHEN p_plan_type = 'standard' THEN 3
      WHEN p_plan_type = 'premium' THEN 5
    END,
    visualizations_per_analysis = CASE 
      WHEN p_plan_type = 'free' THEN 0  -- Free plan: no visualizations
      WHEN p_plan_type = 'trial' THEN 1
      WHEN p_plan_type = 'standard' THEN 1
      WHEN p_plan_type = 'premium' THEN 3
    END,
    monthly_library_limit = CASE 
      WHEN p_plan_type = 'free' THEN 30  -- Free plan: 30 dreams limit
      WHEN p_plan_type = 'trial' THEN NULL
      WHEN p_plan_type = 'standard' THEN 60  -- Updated from 90 to 60
      WHEN p_plan_type = 'premium' THEN 90
    END,
    status = CASE 
      WHEN p_plan_type = 'trial' THEN 'trial'
      ELSE 'active'
    END,
    updated_at = now()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Add trial_visual_analyses_used column to subscriptions table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'trial_visual_analyses_used'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN trial_visual_analyses_used integer DEFAULT 0;
  END IF;
END $$;

-- 6. Add visual_analyses_used column to daily_limits table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_limits' AND column_name = 'visual_analyses_used'
  ) THEN
    ALTER TABLE daily_limits ADD COLUMN visual_analyses_used integer DEFAULT 0;
  END IF;
END $$;

-- 7. Function to check advanced analysis limit (unlimited for trial/standard/premium, but trial expires after 7 days)
CREATE OR REPLACE FUNCTION check_advanced_analysis_limit(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_plan_type text;
  v_trial_end_date timestamptz;
BEGIN
  -- Get user's plan type and trial end date
  SELECT plan_type, trial_end_date INTO v_plan_type, v_trial_end_date
  FROM subscriptions
  WHERE user_id = p_user_id;
  
  -- If no subscription found, default to trial
  IF v_plan_type IS NULL THEN
    v_plan_type := 'trial';
  END IF;
  
  -- Trial users: check if trial has expired (7 days after activation)
  IF v_plan_type = 'trial' THEN
    IF v_trial_end_date IS NOT NULL AND v_trial_end_date < NOW() THEN
      -- Trial expired - cannot use advanced analysis
      RETURN jsonb_build_object(
        'can_analyze', false,
        'used', 0,
        'limit', 0,
        'is_unlimited', false,
        'trial_expired', true
      );
    END IF;
    -- Trial active - unlimited advanced analysis
    RETURN jsonb_build_object(
      'can_analyze', true,
      'used', 0,
      'limit', NULL,
      'is_unlimited', true,
      'trial_expired', false
    );
  END IF;
  
  -- Advanced analysis is unlimited for standard and premium plans
  IF v_plan_type IN ('standard', 'premium') THEN
    RETURN jsonb_build_object(
      'can_analyze', true,
      'used', 0,
      'limit', NULL,
      'is_unlimited', true
    );
  END IF;
  
  -- Free plan users cannot use advanced analysis
  RETURN jsonb_build_object(
    'can_analyze', false,
    'used', 0,
    'limit', 0,
    'is_unlimited', false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Function to check visual analysis limit
CREATE OR REPLACE FUNCTION check_visual_analysis_limit(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_plan_type text;
  v_trial_visual_used integer;
  v_trial_end_date timestamptz;
  v_current_date date;
  v_daily_limit_record record;
  v_visual_used integer;
  v_visual_limit integer;
BEGIN
  -- Get user's plan type, trial visual used, and trial end date
  SELECT plan_type, trial_visual_analyses_used, trial_end_date 
  INTO v_plan_type, v_trial_visual_used, v_trial_end_date
  FROM subscriptions
  WHERE user_id = p_user_id;
  
  -- If no subscription found, default to trial
  IF v_plan_type IS NULL THEN
    v_plan_type := 'trial';
  END IF;
  
  -- Trial users: 7 total visual analyses during trial period (only if trial hasn't expired)
  IF v_plan_type = 'trial' THEN
    -- Check if trial has expired (7 days after activation)
    IF v_trial_end_date IS NOT NULL AND v_trial_end_date < NOW() THEN
      -- Trial expired - cannot use visual analysis
      RETURN jsonb_build_object(
        'can_analyze', false,
        'used', COALESCE(v_trial_visual_used, 0),
        'limit', 7,
        'is_trial', true,
        'trial_expired', true
      );
    END IF;
    
    -- Trial active - check if 7 visual analyses limit reached
    RETURN jsonb_build_object(
      'can_analyze', COALESCE(v_trial_visual_used, 0) < 7,
      'used', COALESCE(v_trial_visual_used, 0),
      'limit', 7,
      'is_trial', true,
      'trial_expired', false
    );
  END IF;
  
  -- Standard users: 3 visual analyses per day
  IF v_plan_type = 'standard' THEN
    v_visual_limit := 3;
    v_current_date := CURRENT_DATE;
    
    SELECT * INTO v_daily_limit_record
    FROM daily_limits
    WHERE user_id = p_user_id AND date = v_current_date;
    
    -- If no record exists for today, create one
    IF v_daily_limit_record IS NULL THEN
      INSERT INTO daily_limits (user_id, date, analyses_used, analyses_limit, visual_analyses_used)
      VALUES (p_user_id, v_current_date, 0, 3, 0)
      ON CONFLICT (user_id, date) DO NOTHING
      RETURNING * INTO v_daily_limit_record;
      
      IF v_daily_limit_record IS NULL THEN
        SELECT * INTO v_daily_limit_record
        FROM daily_limits
        WHERE user_id = p_user_id AND date = v_current_date;
      END IF;
    END IF;
    
    v_visual_used := COALESCE(v_daily_limit_record.visual_analyses_used, 0);
    
    RETURN jsonb_build_object(
      'can_analyze', v_visual_used < v_visual_limit,
      'used', v_visual_used,
      'limit', v_visual_limit,
      'is_trial', false
    );
  END IF;
  
  -- Premium users: 5 visual analyses per day
  IF v_plan_type = 'premium' THEN
    v_visual_limit := 5;
    v_current_date := CURRENT_DATE;
    
    SELECT * INTO v_daily_limit_record
    FROM daily_limits
    WHERE user_id = p_user_id AND date = v_current_date;
    
    -- If no record exists for today, create one
    IF v_daily_limit_record IS NULL THEN
      INSERT INTO daily_limits (user_id, date, analyses_used, analyses_limit, visual_analyses_used)
      VALUES (p_user_id, v_current_date, 0, 5, 0)
      ON CONFLICT (user_id, date) DO NOTHING
      RETURNING * INTO v_daily_limit_record;
      
      IF v_daily_limit_record IS NULL THEN
        SELECT * INTO v_daily_limit_record
        FROM daily_limits
        WHERE user_id = p_user_id AND date = v_current_date;
      END IF;
    END IF;
    
    v_visual_used := COALESCE(v_daily_limit_record.visual_analyses_used, 0);
    
    RETURN jsonb_build_object(
      'can_analyze', v_visual_used < v_visual_limit,
      'used', v_visual_used,
      'limit', v_visual_limit,
      'is_trial', false
    );
  END IF;
  
  -- Free plan users cannot use visual analysis
  RETURN jsonb_build_object(
    'can_analyze', false,
    'used', 0,
    'limit', 0,
    'is_trial', false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Function to increment visual analysis count
CREATE OR REPLACE FUNCTION increment_visual_analysis(p_user_id uuid)
RETURNS void AS $$
DECLARE
  v_plan_type text;
  v_trial_end_date timestamptz;
  v_current_date date;
BEGIN
  -- Get user's plan type and trial end date
  SELECT plan_type, trial_end_date INTO v_plan_type, v_trial_end_date
  FROM subscriptions
  WHERE user_id = p_user_id;
  
  -- Trial users: increment trial_visual_analyses_used (only if trial hasn't expired)
  IF v_plan_type = 'trial' THEN
    -- Check if trial has expired
    IF v_trial_end_date IS NOT NULL AND v_trial_end_date < NOW() THEN
      -- Trial expired - do not increment
      RETURN;
    END IF;
    
    -- Trial active - increment counter
    UPDATE subscriptions
    SET trial_visual_analyses_used = COALESCE(trial_visual_analyses_used, 0) + 1
    WHERE user_id = p_user_id;
  END IF;
  
  -- Standard and Premium users: increment daily visual_analyses_used
  IF v_plan_type IN ('standard', 'premium') THEN
    v_current_date := CURRENT_DATE;
    
    INSERT INTO daily_limits (user_id, date, analyses_used, analyses_limit, visual_analyses_used)
    VALUES (p_user_id, v_current_date, 0, 
            CASE WHEN v_plan_type = 'standard' THEN 3 ELSE 5 END, 
            1)
    ON CONFLICT (user_id, date)
    DO UPDATE SET
      visual_analyses_used = COALESCE(daily_limits.visual_analyses_used, 0) + 1,
      created_at = now()
    WHERE daily_limits.user_id = p_user_id AND daily_limits.date = v_current_date;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Update check_daily_analysis_limit function (now only for basic analysis)
CREATE OR REPLACE FUNCTION check_daily_analysis_limit(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_plan_type text;
BEGIN
  -- Get user's plan type
  SELECT plan_type INTO v_plan_type
  FROM subscriptions
  WHERE user_id = p_user_id;
  
  -- If no subscription found, default to trial
  IF v_plan_type IS NULL THEN
    v_plan_type := 'trial';
  END IF;
  
  -- Free plan users have unlimited basic analyses
  IF v_plan_type = 'free' THEN
    RETURN jsonb_build_object(
      'can_analyze', true,
      'used', 0,
      'limit', NULL,
      'is_free', true
    );
  END IF;
  
  -- Trial, Standard, Premium users have unlimited basic analyses
  -- (Advanced and visual have separate limits)
  RETURN jsonb_build_object(
    'can_analyze', true,
    'used', 0,
    'limit', NULL,
    'is_unlimited', true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Update check_trial_analysis_limit function (now only checks advanced analysis for trial)
-- Note: This function is kept for backward compatibility but advanced analysis is now unlimited for trial users
CREATE OR REPLACE FUNCTION check_trial_analysis_limit(p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  v_plan_type text;
BEGIN
  -- Kullanıcının plan tipini kontrol et
  SELECT plan_type INTO v_plan_type
  FROM subscriptions
  WHERE user_id = p_user_id;
  
  -- Eğer trial değilse true döndür (advanced analysis is unlimited for standard/premium)
  IF v_plan_type != 'trial' THEN
    RETURN true;
  END IF;
  
  -- Trial kullanıcılar için advanced analysis sınırsız
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Update handle_new_user function to use 7 days for trial
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'username', '')
  );
  
  INSERT INTO public.subscriptions (
    user_id,
    plan_type,
    trial_start_date,
    trial_end_date,
    trial_analyses_used
  ) VALUES (
    NEW.id,
    'trial',
    now(),
    now() + interval '7 days',  -- Updated from 5 days to 7 days
    0
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Create index on analysis_type for better query performance
CREATE INDEX IF NOT EXISTS idx_dreams_analysis_type ON dreams(analysis_type);

-- 14. Add comment to analysis_type column
COMMENT ON COLUMN dreams.analysis_type IS 'Type of analysis: basic (free plan, no visuals), advanced (trial/standard/premium unlimited, no visuals), basic_visual (basic analysis with visuals), advanced_visual (advanced analysis with visuals)';

-- 15. Add comment to trial_visual_analyses_used column
COMMENT ON COLUMN subscriptions.trial_visual_analyses_used IS 'Number of visual analyses used during trial period (max 7)';

-- 16. Add comment to visual_analyses_used column
COMMENT ON COLUMN daily_limits.visual_analyses_used IS 'Number of visual analyses used today (standard: max 3, premium: max 5)';

-- 17. Function to automatically convert expired trial users to free plan
CREATE OR REPLACE FUNCTION auto_convert_expired_trials_to_free()
RETURNS void AS $$
BEGIN
  -- Update all trial subscriptions that have expired to free plan
  UPDATE subscriptions
  SET 
    plan_type = 'free',
    daily_analysis_limit = NULL,
    visualizations_per_analysis = 0,
    monthly_library_limit = 30,
    status = 'active',
    updated_at = now()
  WHERE plan_type = 'trial'
    AND trial_end_date IS NOT NULL
    AND trial_end_date < NOW()
    AND status = 'trial';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 18. Update all existing dreams to advanced, basic_visual, or advanced_visual (not basic)
-- This migration updates all existing dreams that have images to be either 'basic_visual' or 'advanced_visual'
-- Dreams with images will be set to 'basic_visual' or 'advanced_visual' based on their current analysis_type
-- Dreams without images will be set to 'advanced' (assuming they were not basic)
UPDATE dreams
SET analysis_type = CASE 
  WHEN (image_url IS NOT NULL AND image_url != '') OR (image_url_2 IS NOT NULL AND image_url_2 != '') OR (image_url_3 IS NOT NULL AND image_url_3 != '') THEN
    CASE 
      WHEN analysis_type = 'advanced' OR analysis_type IS NULL THEN 'advanced_visual'
      ELSE 'basic_visual'
    END
  ELSE 
    CASE 
      WHEN analysis_type = 'advanced' OR analysis_type IS NULL THEN 'advanced'
      ELSE 'basic'
    END
END
WHERE analysis_type IS NULL OR analysis_type IN ('basic', 'advanced', 'visual');

-- 19. Update check_trial_expiration function to also convert expired trials to free
CREATE OR REPLACE FUNCTION check_trial_expiration(p_user_id uuid)
RETURNS void AS $$
DECLARE
  v_trial_end_date timestamptz;
  v_notification_exists boolean;
  v_plan_type text;
  v_status text;
BEGIN
  -- Get subscription info (trial info is in subscriptions table, not profiles)
  SELECT plan_type, status, trial_end_date INTO v_plan_type, v_status, v_trial_end_date
  FROM subscriptions
  WHERE user_id = p_user_id;
  
  -- Check if trial has expired (trial was used if plan_type is 'trial')
  IF v_plan_type = 'trial' AND v_trial_end_date IS NOT NULL AND v_trial_end_date < NOW() THEN
    -- Eğer hala trial planındaysa ve trial bitmişse, free plan'a geçir
    IF v_status = 'trial' THEN
      -- Convert to free plan
      UPDATE subscriptions
      SET 
        plan_type = 'free',
        daily_analysis_limit = NULL,
        visualizations_per_analysis = 0,
        monthly_library_limit = 30,
        status = 'active',
        updated_at = now()
      WHERE user_id = p_user_id;
      
      -- Clear trial library
      PERFORM clear_trial_library_on_expiration(p_user_id);
    END IF;
    
    -- Check if notification already exists (including deleted ones) to avoid duplicates
    -- Once a trial_expired notification has been created for this user, never create it again
    SELECT EXISTS(
      SELECT 1 FROM notifications
      WHERE user_id = p_user_id
      AND type = 'trial_expired'
    ) INTO v_notification_exists;
    
    -- Create notification only if it has NEVER been created before (even if deleted)
    -- This ensures the notification is only sent once, even if the user deletes it
    IF NOT v_notification_exists THEN
      INSERT INTO notifications (user_id, type, actor_id, dream_id)
      VALUES (p_user_id, 'trial_expired', NULL, NULL);
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
