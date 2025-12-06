/*
  # Fix Subscription Plan Update - Use UPSERT
  
  This migration updates the update_subscription_plan function to use
  INSERT ... ON CONFLICT (upsert) instead of UPDATE, so it can create
  a subscription if it doesn't exist.
*/

-- Update update_subscription_plan function to use UPSERT
CREATE OR REPLACE FUNCTION update_subscription_plan(
  p_user_id uuid,
  p_plan_type text
)
RETURNS void AS $$
BEGIN
  -- Use INSERT ... ON CONFLICT (UPSERT) to create or update subscription
  INSERT INTO subscriptions (
    user_id,
    plan_type,
    daily_analysis_limit,
    visualizations_per_analysis,
    monthly_library_limit,
    status,
    trial_start_date,
    trial_end_date,
    trial_analyses_used,
    trial_visual_analyses_used,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    p_plan_type,
    CASE 
      WHEN p_plan_type = 'free' THEN NULL  -- Free plan: unlimited basic analyses
      WHEN p_plan_type = 'trial' THEN 5
      WHEN p_plan_type = 'standard' THEN 3
      WHEN p_plan_type = 'premium' THEN 5
    END,
    CASE 
      WHEN p_plan_type = 'free' THEN 0  -- Free plan: no visualizations
      WHEN p_plan_type = 'trial' THEN 1
      WHEN p_plan_type = 'standard' THEN 1
      WHEN p_plan_type = 'premium' THEN 3
    END,
    CASE 
      WHEN p_plan_type = 'free' THEN 30  -- Free plan: 30 dreams limit
      WHEN p_plan_type = 'trial' THEN NULL
      WHEN p_plan_type = 'standard' THEN 60
      WHEN p_plan_type = 'premium' THEN 90
    END,
    CASE 
      WHEN p_plan_type = 'trial' THEN 'trial'
      ELSE 'active'
    END,
    CASE 
      WHEN p_plan_type = 'trial' THEN now()
      ELSE NULL
    END,
    CASE 
      WHEN p_plan_type = 'trial' THEN now() + interval '7 days'
      ELSE NULL
    END,
    0,  -- trial_analyses_used
    0,  -- trial_visual_analyses_used
    now(),
    now()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    plan_type = p_plan_type,
    daily_analysis_limit = CASE 
      WHEN p_plan_type = 'free' THEN NULL
      WHEN p_plan_type = 'trial' THEN 5
      WHEN p_plan_type = 'standard' THEN 3
      WHEN p_plan_type = 'premium' THEN 5
    END,
    visualizations_per_analysis = CASE 
      WHEN p_plan_type = 'free' THEN 0
      WHEN p_plan_type = 'trial' THEN 1
      WHEN p_plan_type = 'standard' THEN 1
      WHEN p_plan_type = 'premium' THEN 3
    END,
    monthly_library_limit = CASE 
      WHEN p_plan_type = 'free' THEN 30
      WHEN p_plan_type = 'trial' THEN NULL
      WHEN p_plan_type = 'standard' THEN 60
      WHEN p_plan_type = 'premium' THEN 90
    END,
    status = CASE 
      WHEN p_plan_type = 'trial' THEN 'trial'
      ELSE 'active'
    END,
    -- Only update trial dates if switching TO trial (not FROM trial)
    trial_start_date = CASE 
      WHEN p_plan_type = 'trial' AND subscriptions.plan_type != 'trial' THEN now()
      ELSE subscriptions.trial_start_date
    END,
    trial_end_date = CASE 
      WHEN p_plan_type = 'trial' AND subscriptions.plan_type != 'trial' THEN now() + interval '7 days'
      ELSE subscriptions.trial_end_date
    END,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
