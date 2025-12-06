/*
  # Dream Completion Notification System
  
  This migration adds:
  1. 'dream_completed' type to notifications table
  2. Trigger to create notification when dream status changes to 'completed'
*/

-- Update notifications table to include 'dream_completed' type
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type IN ('like', 'comment', 'follow', 'mention', 'dream_completed'));

-- Create function to notify when dream is completed
CREATE OR REPLACE FUNCTION notify_on_dream_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notification if status changed from something else to 'completed'
  IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
    -- Create notification directly without using create_notification function
    -- since this is a system notification without an actor
    INSERT INTO notifications (user_id, type, actor_id, dream_id)
    VALUES (NEW.user_id, 'dream_completed', NULL, NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for dream completion notifications
DROP TRIGGER IF EXISTS trigger_notify_on_dream_completion ON dreams;
CREATE TRIGGER trigger_notify_on_dream_completion
  AFTER UPDATE ON dreams
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_dream_completion();
