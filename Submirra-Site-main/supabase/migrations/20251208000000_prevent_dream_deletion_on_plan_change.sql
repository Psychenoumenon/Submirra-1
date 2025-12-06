/*
  # Prevent Dream Deletion on Plan Change
  
  This migration:
  1. Disables the clear_trial_library_on_expiration function (makes it do nothing)
  2. Removes the call to clear_trial_library_on_expiration from check_trial_expiration
  3. Ensures dreams are never deleted when plan changes
*/

-- 1. Disable clear_trial_library_on_expiration function - make it do nothing
CREATE OR REPLACE FUNCTION clear_trial_library_on_expiration(p_user_id uuid)
RETURNS void AS $$
BEGIN
  -- DISABLED: Dreams should never be deleted when plan changes
  -- This function is kept for backward compatibility but does nothing
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update check_trial_expiration to NOT delete dreams
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
      
      -- REMOVED: clear_trial_library_on_expiration call - dreams should NOT be deleted
      -- PERFORM clear_trial_library_on_expiration(p_user_id);
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

-- 3. Update auto_convert_expired_trials_to_free to NOT delete dreams
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
  
  -- REMOVED: No dream deletion - dreams should be preserved
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Add comment explaining that dreams are never deleted on plan change
COMMENT ON FUNCTION clear_trial_library_on_expiration(uuid) IS 'DISABLED: This function no longer deletes dreams. Dreams are preserved when plan changes.';


