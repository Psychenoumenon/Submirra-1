/*
  # Fix Trial to Free Plan Conversion - Library Limit
  
  The previous migration had a bug: when trial expires and user is converted
  to free plan, monthly_library_limit was set to 30 instead of 10.
  
  Free plan should have:
  - monthly_library_limit = 10 (not 30!)
*/

-- Fix auto_convert_expired_trials_to_free function
CREATE OR REPLACE FUNCTION auto_convert_expired_trials_to_free()
RETURNS void AS $$
DECLARE
  v_user_record record;
BEGIN
  -- Update all trial subscriptions that have expired to free plan
  FOR v_user_record IN
    SELECT user_id, trial_end_date, COALESCE(trial_expired_notification_sent, false) as notification_sent
    FROM subscriptions
    WHERE plan_type = 'trial'
      AND trial_end_date IS NOT NULL
      AND trial_end_date < NOW()
      AND status = 'trial'
  LOOP
    -- Convert to free plan with CORRECT limits
    UPDATE subscriptions
    SET 
      plan_type = 'free',
      daily_analysis_limit = NULL,  -- Free: unlimited basic analyses
      visualizations_per_analysis = 0,  -- Free: no visualizations
      monthly_library_limit = 10,  -- Free: 10 dreams (FIXED from 30!)
      status = 'active',
      updated_at = now()
    WHERE user_id = v_user_record.user_id;
    
    -- CRITICAL: Only create notification if it has NEVER been sent before
    IF NOT v_user_record.notification_sent THEN
      -- Create the notification
      INSERT INTO notifications (user_id, type, actor_id, dream_id)
      VALUES (v_user_record.user_id, 'trial_expired', NULL, NULL);
      
      -- Mark that the notification has been sent (this flag NEVER gets reset)
      UPDATE subscriptions
      SET trial_expired_notification_sent = true
      WHERE user_id = v_user_record.user_id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also fix any existing users who were incorrectly converted with 30 limit
UPDATE subscriptions
SET monthly_library_limit = 10
WHERE plan_type = 'free'
  AND monthly_library_limit = 30;

-- Add comment
COMMENT ON FUNCTION auto_convert_expired_trials_to_free IS 'Converts expired trial subscriptions to free plan with correct limits (10 dreams, no visualizations)';
