/*
  # Find Dreams for Specific User: 4e319154-a316-4367-b8d6-d7776cef9d70
  
  This script searches for dreams that belong to this specific user.
*/

-- Check all dreams for this specific user (no date limit)
SELECT 
  id,
  user_id,
  analysis_type,
  status,
  is_public,
  created_at,
  image_url,
  image_url_2,
  image_url_3
FROM dreams
WHERE user_id = '4e319154-a316-4367-b8d6-d7776cef9d70'::uuid
ORDER BY created_at DESC;

-- Count total dreams for this user
SELECT COUNT(*) AS total_dreams
FROM dreams
WHERE user_id = '4e319154-a316-4367-b8d6-d7776cef9d70'::uuid;

-- Check dreams created before the plan change (before 2025-12-06)
SELECT 
  id,
  user_id,
  analysis_type,
  status,
  created_at
FROM dreams
WHERE user_id = '4e319154-a316-4367-b8d6-d7776cef9d70'::uuid
  AND created_at < '2025-12-06'::timestamp
ORDER BY created_at DESC;

-- Check if there are any dreams with this user_id in any status
SELECT 
  status,
  COUNT(*) AS count
FROM dreams
WHERE user_id = '4e319154-a316-4367-b8d6-d7776cef9d70'::uuid
GROUP BY status;

-- Check subscription history to see when plan was changed
SELECT 
  user_id,
  plan_type,
  updated_at,
  created_at,
  trial_end_date
FROM subscriptions
WHERE user_id = '4e319154-a316-4367-b8d6-d7776cef9d70'::uuid;


