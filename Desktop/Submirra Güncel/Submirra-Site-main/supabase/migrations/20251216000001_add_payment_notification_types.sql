/*
  # Add Payment Notification Types
  
  This migration adds new notification types for payment-related events
*/

-- First, check and clean any invalid notification types
-- Update notifications table constraint to include payment-related types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add new constraint with all existing and new types
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type IN (
    'like', 
    'comment', 
    'follow', 
    'mention', 
    'trial_expired', 
    'payment_failed', 
    'subscription_cancelled', 
    'dream_completed'
  ));

-- Add comment
COMMENT ON COLUMN notifications.type IS 'Notification type: like, comment, follow, mention, trial_expired, payment_failed, subscription_cancelled, dream_completed';
