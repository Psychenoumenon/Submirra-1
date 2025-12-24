-- Fix Trial Expired Notification - Only Send Once
-- This migration ensures the trial_expired notification is only sent once per user
-- IMPORTANT: This should NEVER be changed or broken

-- Note: The column 'trial_expired_notification_sent' should already exist
-- If it doesn't exist, run this first:
-- ALTER TABLE subscriptions ADD COLUMN trial_expired_notification_sent boolean DEFAULT false;

-- For existing users who already have a trial_expired notification, set the flag to true
UPDATE subscriptions
SET trial_expired_notification_sent = true
WHERE user_id IN (
  SELECT DISTINCT user_id
  FROM notifications
  WHERE type = 'trial_expired'
)
AND (trial_expired_notification_sent IS NULL OR trial_expired_notification_sent = false);

-- Update check_trial_expiration function to use the flag
CREATE OR REPLACE FUNCTION check_trial_expiration(p_user_id uuid)
RETURNS void AS $$
DECLARE
  v_trial_end_date timestamptz;
  v_notification_sent boolean;
  v_plan_type text;
  v_status text;
BEGIN
  -- Get subscription info (trial info is in subscriptions table, not profiles)
  SELECT plan_type, status, trial_end_date, COALESCE(trial_expired_notification_sent, false)
  INTO v_plan_type, v_status, v_trial_end_date, v_notification_sent
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
    END IF;
    
    -- CRITICAL: Only create notification if it has NEVER been sent before
    -- This flag persists even if the user deletes the notification
    -- This ensures the notification is only sent ONCE, EVER
    IF NOT v_notification_sent THEN
      -- Create the notification
      INSERT INTO notifications (user_id, type, actor_id, dream_id)
      VALUES (p_user_id, 'trial_expired', NULL, NULL);
      
      -- Mark that the notification has been sent (this flag NEVER gets reset)
      UPDATE subscriptions
      SET trial_expired_notification_sent = true
      WHERE user_id = p_user_id;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment explaining the flag
COMMENT ON COLUMN subscriptions.trial_expired_notification_sent IS 'CRITICAL: Tracks if trial_expired notification has been sent. Once set to true, it NEVER gets reset, ensuring the notification is only sent once per user, even if they delete it.';

-- Update auto_convert_expired_trials_to_free to also check the flag
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
    -- Convert to free plan
    UPDATE subscriptions
    SET 
      plan_type = 'free',
      daily_analysis_limit = NULL,
      visualizations_per_analysis = 0,
      monthly_library_limit = 30,
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
