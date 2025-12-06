/*
  # Fix Subscription Insert for User UUID
  
  This migration creates a subscription for the user with UUID: cf059e97-ae1c-40a9-88f2-ae0734fb1cdf
  
  It explicitly sets the id field to avoid null constraint violations.
*/

-- Create subscription for the specified user if it doesn't exist
INSERT INTO subscriptions (
  id,
  user_id,
  plan_type,
  status,
  subscription_start_date,
  subscription_end_date,
  daily_analysis_limit,
  visualizations_per_analysis,
  monthly_library_limit,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(), -- Generate UUID for subscription id
  'cf059e97-ae1c-40a9-88f2-ae0734fb1cdf',
  'premium',
  'active',
  now(),
  NULL, -- No end date for premium
  5,
  3,
  NULL, -- Unlimited for premium
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM subscriptions WHERE user_id = 'cf059e97-ae1c-40a9-88f2-ae0734fb1cdf'
)
AND EXISTS (
  SELECT 1 FROM auth.users WHERE id = 'cf059e97-ae1c-40a9-88f2-ae0734fb1cdf'
);

