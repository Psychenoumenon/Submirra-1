/*
  # Add Premium Plan to Developer Users
  
  This migration adds premium plan to developer users.
  
  Developer users:
    - ded2c1c6-7064-499f-a1e7-a8f90c95904a
    - 4e319154-a316-4367-b8d6-d7776cef9d70
    - cf059e97-ae1c-40a9-88f2-ae0734fb1cdf
*/

-- Update subscriptions for developer users to premium plan
UPDATE subscriptions
SET 
  plan_type = 'premium',
  status = 'active',
  daily_analysis_limit = 5,
  visualizations_per_analysis = 3,
  monthly_library_limit = NULL, -- Unlimited for premium
  updated_at = now()
WHERE user_id IN (
  'ded2c1c6-7064-499f-a1e7-a8f90c95904a',
  '4e319154-a316-4367-b8d6-d7776cef9d70',
  'cf059e97-ae1c-40a9-88f2-ae0734fb1cdf'
)
AND (plan_type != 'premium' OR plan_type IS NULL);

-- If subscription doesn't exist, create it
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
  id,
  'premium',
  'active',
  now(),
  NULL, -- No end date for premium
  5,
  3,
  NULL, -- Unlimited for premium
  now(),
  now()
FROM auth.users
WHERE id IN (
  'ded2c1c6-7064-499f-a1e7-a8f90c95904a',
  '4e319154-a316-4367-b8d6-d7776cef9d70',
  'cf059e97-ae1c-40a9-88f2-ae0734fb1cdf'
)
AND id NOT IN (
  SELECT user_id FROM subscriptions WHERE user_id IN (
    'ded2c1c6-7064-499f-a1e7-a8f90c95904a',
    '4e319154-a316-4367-b8d6-d7776cef9d70',
    'cf059e97-ae1c-40a9-88f2-ae0734fb1cdf'
  )
);

