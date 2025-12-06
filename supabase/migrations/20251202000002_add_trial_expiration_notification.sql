/*
  # Trial Expiration Notification System
  
  This migration adds:
  1. 'trial_expired' type to notifications table
  2. Function to check and create trial expiration notifications
*/

-- Update notifications table to include 'trial_expired' type
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type IN ('like', 'comment', 'follow', 'mention', 'dream_completed', 'trial_expired'));

-- Function to check trial expiration and create notification if needed
CREATE OR REPLACE FUNCTION check_trial_expiration(p_user_id uuid)
RETURNS void AS $$
DECLARE
  v_trial_end timestamptz;
  v_trial_used boolean;
  v_notification_exists boolean;
BEGIN
  -- Get trial info
  SELECT trial_end, trial_used INTO v_trial_end, v_trial_used
  FROM profiles
  WHERE id = p_user_id;
  
  -- Check if trial has expired and was used
  IF v_trial_used = true AND v_trial_end IS NOT NULL AND v_trial_end < NOW() THEN
    -- Check if notification already exists (to avoid duplicates)
    SELECT EXISTS(
      SELECT 1 FROM notifications
      WHERE user_id = p_user_id
      AND type = 'trial_expired'
      AND created_at > v_trial_end
    ) INTO v_notification_exists;
    
    -- Create notification if it doesn't exist
    IF NOT v_notification_exists THEN
      INSERT INTO notifications (user_id, type, actor_id, dream_id)
      VALUES (p_user_id, 'trial_expired', NULL, NULL);
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


