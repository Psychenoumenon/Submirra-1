/*
  # Restore Deleted Dreams - Helper Script
  
  This script attempts to restore dreams that were deleted when plan changed.
  
  IMPORTANT: This script can only restore dreams if:
  1. Supabase has automatic backups enabled
  2. The dreams were deleted recently (within backup retention period)
  3. You have access to the backup data
  
  If you don't have backups, the deleted dreams cannot be restored.
  
  To use this script:
  1. First, check if you have backups in Supabase Dashboard > Database > Backups
  2. If you have backups, you can restore from a point-in-time before the deletion
  3. Alternatively, if you have a backup table or archive, restore from there
  
  NOTE: This is a template script. You need to:
  - Replace USER_ID_HERE with actual user IDs
  - Adjust the backup date/time if restoring from backup
  - Verify the data before restoring
*/

-- OPTION 1: If you have a backup table or archive, restore from there
-- Uncomment and modify this section if you have a backup table

/*
-- Example: Restore from a backup table (if you created one)
INSERT INTO dreams (
  id,
  user_id,
  dream_text,
  analysis_text,
  image_url,
  image_url_2,
  image_url_3,
  analysis_type,
  status,
  is_public,
  is_favorite,
  primary_image_index,
  dream_text_tr,
  dream_text_en,
  analysis_text_tr,
  analysis_text_en,
  created_at,
  updated_at
)
SELECT 
  id,
  user_id,
  dream_text,
  analysis_text,
  image_url,
  image_url_2,
  image_url_3,
  analysis_type,
  status,
  is_public,
  is_favorite,
  primary_image_index,
  dream_text_tr,
  dream_text_en,
  analysis_text_tr,
  analysis_text_en,
  created_at,
  updated_at
FROM dreams_backup
WHERE user_id = 'USER_ID_HERE'::uuid
  AND NOT EXISTS (
    SELECT 1 FROM dreams 
    WHERE dreams.id = dreams_backup.id
  );
*/

-- OPTION 2: Point-in-time recovery from Supabase backups
-- This requires Supabase Dashboard > Database > Backups > Point-in-time recovery
-- You need to restore the entire database to a point before the deletion
-- This is done through Supabase Dashboard, not SQL

-- OPTION 3: If you have exported data, restore from CSV/JSON
-- Use Supabase's import feature or psql COPY command

-- Check for users who might have lost dreams due to plan changes
-- This query helps identify affected users
SELECT 
  s.user_id,
  s.plan_type,
  s.updated_at AS plan_changed_at,
  COUNT(d.id) AS current_dream_count,
  p.username,
  p.full_name
FROM subscriptions s
LEFT JOIN profiles p ON p.id = s.user_id
LEFT JOIN dreams d ON d.user_id = s.user_id
WHERE s.plan_type IN ('free', 'standard', 'premium')
  AND s.updated_at > NOW() - INTERVAL '30 days'
GROUP BY s.user_id, s.plan_type, s.updated_at, p.username, p.full_name
ORDER BY s.updated_at DESC;

-- Note: To actually restore dreams, you need to:
-- 1. Access Supabase Dashboard > Database > Backups
-- 2. Find a backup from before the deletion
-- 3. Restore that backup or extract the dreams data
-- 4. Insert the restored dreams back into the dreams table


