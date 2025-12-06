/*
  # Daily Analysis Limit Functions
  
  This migration adds functions to check and increment daily analysis limits
  for standard and premium users. Trial users use trial_analyses_used (total 5).
  
  - Standard users: 3 analyses per day
  - Premium users: 5 analyses per day
  - Limits reset automatically after 24 hours (using date column)
*/

-- Function to check daily analysis limit
CREATE OR REPLACE FUNCTION check_daily_analysis_limit(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_plan_type text;
  v_daily_limit integer;
  v_analyses_used integer;
  v_current_date date;
  v_daily_limit_record record;
  v_trial_analyses_used integer;
BEGIN
  -- Get user's plan type and daily limit
  SELECT plan_type, daily_analysis_limit INTO v_plan_type, v_daily_limit
  FROM subscriptions
  WHERE user_id = p_user_id;
  
  -- If no subscription found, default to trial
  IF v_plan_type IS NULL THEN
    v_plan_type := 'trial';
    v_daily_limit := 5;
  END IF;
  
  -- Trial users don't use daily limits, they use trial_analyses_used
  IF v_plan_type = 'trial' THEN
    SELECT COALESCE(trial_analyses_used, 0) INTO v_trial_analyses_used
    FROM subscriptions
    WHERE user_id = p_user_id;
    
    RETURN jsonb_build_object(
      'can_analyze', v_trial_analyses_used < 5,
      'used', v_trial_analyses_used,
      'limit', 5,
      'is_trial', true
    );
  END IF;
  
  -- Get or create daily limit record for today
  v_current_date := CURRENT_DATE;
  
  SELECT * INTO v_daily_limit_record
  FROM daily_limits
  WHERE user_id = p_user_id AND date = v_current_date;
  
  -- If no record exists for today, create one
  IF v_daily_limit_record IS NULL THEN
    INSERT INTO daily_limits (user_id, date, analyses_used, analyses_limit)
    VALUES (p_user_id, v_current_date, 0, v_daily_limit)
    ON CONFLICT (user_id, date) DO NOTHING
    RETURNING * INTO v_daily_limit_record;
    
    -- If still null, try to select again
    IF v_daily_limit_record IS NULL THEN
      SELECT * INTO v_daily_limit_record
      FROM daily_limits
      WHERE user_id = p_user_id AND date = v_current_date;
    END IF;
  END IF;
  
  -- Get analyses used (default to 0 if null)
  v_analyses_used := COALESCE(v_daily_limit_record.analyses_used, 0);
  
  -- Check if user can analyze
  RETURN jsonb_build_object(
    'can_analyze', v_analyses_used < v_daily_limit,
    'used', v_analyses_used,
    'limit', v_daily_limit,
    'is_trial', false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment daily analysis count
CREATE OR REPLACE FUNCTION increment_daily_analysis(p_user_id uuid)
RETURNS void AS $$
DECLARE
  v_plan_type text;
  v_daily_limit integer;
  v_current_date date;
BEGIN
  -- Get user's plan type
  SELECT plan_type, daily_analysis_limit INTO v_plan_type, v_daily_limit
  FROM subscriptions
  WHERE user_id = p_user_id;
  
  -- Only increment for standard and premium users
  IF v_plan_type IN ('standard', 'premium') THEN
    v_current_date := CURRENT_DATE;
    
    -- Insert or update daily limit record
    INSERT INTO daily_limits (user_id, date, analyses_used, analyses_limit)
    VALUES (p_user_id, v_current_date, 1, v_daily_limit)
    ON CONFLICT (user_id, date)
    DO UPDATE SET
      analyses_used = daily_limits.analyses_used + 1,
      created_at = now()
    WHERE daily_limits.user_id = p_user_id AND daily_limits.date = v_current_date;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
