/*
  # Additional Stats for User: 4e319154-a316-4367-b8d6-d7776cef9d70
  
  Run these queries separately after the main check_user_dreams.sql
*/

-- Count dreams by status
SELECT 
  status,
  COUNT(*) AS count
FROM dreams
WHERE user_id = '4e319154-a316-4367-b8d6-d7776cef9d70'::uuid
GROUP BY status;

-- Count dreams by analysis_type
SELECT 
  analysis_type,
  COUNT(*) AS count
FROM dreams
WHERE user_id = '4e319154-a316-4367-b8d6-d7776cef9d70'::uuid
GROUP BY analysis_type;

-- Check subscription info
SELECT 
  user_id,
  plan_type,
  monthly_library_limit,
  updated_at,
  created_at
FROM subscriptions
WHERE user_id = '4e319154-a316-4367-b8d6-d7776cef9d70'::uuid;

-- Check if dreams exceed library limit
SELECT 
  COUNT(*) AS total_dreams,
  (SELECT monthly_library_limit FROM subscriptions WHERE user_id = '4e319154-a316-4367-b8d6-d7776cef9d70'::uuid) AS library_limit
FROM dreams
WHERE user_id = '4e319154-a316-4367-b8d6-d7776cef9d70'::uuid;


