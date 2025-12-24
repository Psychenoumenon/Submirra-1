/*
  # Find Dreams for User: 4e319154-a316-4367-b8d6-d7776cef9d70
  
  This script searches for dreams that might belong to this user.
*/

-- Check if user exists in profiles
SELECT id, username, full_name, created_at
FROM profiles
WHERE id = '4e319154-a316-4367-b8d6-d7776cef9d70'::uuid;

-- Check subscription info
SELECT 
  user_id,
  plan_type,
  monthly_library_limit,
  updated_at,
  created_at,
  trial_end_date
FROM subscriptions
WHERE user_id = '4e319154-a316-4367-b8d6-d7776cef9d70'::uuid;

-- Check ALL dreams (to see if any exist at all)
SELECT COUNT(*) AS total_dreams_in_database
FROM dreams;

-- Check recent dreams (last 100) to see if any might belong to this user
SELECT 
  id,
  user_id,
  analysis_type,
  status,
  created_at
FROM dreams
ORDER BY created_at DESC
LIMIT 100;

-- Check if there are any dreams with similar timestamps (if we know when they were created)
-- This query checks for dreams created in the last 30 days
SELECT 
  id,
  user_id,
  analysis_type,
  status,
  created_at
FROM dreams
WHERE created_at > NOW() - INTERVAL '30 days'
ORDER BY created_at DESC;


