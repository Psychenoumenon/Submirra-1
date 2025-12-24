/*
  # Cleanup Auto-Created Trial Subscriptions
  
  This migration removes trial subscriptions that were automatically created
  during user registration but were never actually activated by the user.
  
  Only removes subscriptions where:
  - plan_type = 'trial'
  - The user has NOT activated trial in profiles (trial_used = false or NULL)
*/

-- Delete auto-created trial subscriptions for users who haven't activated trial
DELETE FROM subscriptions
WHERE plan_type = 'trial'
  AND user_id IN (
    SELECT id FROM profiles
    WHERE trial_used = false OR trial_used IS NULL
  );

-- Add a comment explaining the change
COMMENT ON TABLE subscriptions IS 'User subscriptions. New users do NOT get automatic subscriptions. Users must explicitly activate a plan from the Pricing page.';
