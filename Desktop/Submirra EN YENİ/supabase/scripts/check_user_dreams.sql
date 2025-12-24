/*
  # Check Dreams for User: 4e319154-a316-4367-b8d6-d7776cef9d70
  
  This script checks if the user's dreams exist in the database.
  Run each query separately if needed.
*/

-- Query 1: Check all dreams for this user
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
