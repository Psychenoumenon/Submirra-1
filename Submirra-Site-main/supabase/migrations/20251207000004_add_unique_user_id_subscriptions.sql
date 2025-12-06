/*
  # Add UNIQUE constraint to subscriptions.user_id
  
  This migration adds a UNIQUE constraint to the user_id column in subscriptions table.
  This is required for the UPSERT operation in update_subscription_plan function.
*/

-- Add UNIQUE constraint to user_id column if it doesn't exist
DO $$
BEGIN
  -- Check if constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'subscriptions_user_id_key'
  ) THEN
    -- Add unique constraint
    ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Add comment
COMMENT ON CONSTRAINT subscriptions_user_id_key ON subscriptions IS 'Each user can have only one subscription record (enforces UPSERT in update_subscription_plan)';
