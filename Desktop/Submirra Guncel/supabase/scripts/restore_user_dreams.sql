/*
  # Restore Dreams for User: 4e319154-a316-4367-b8d6-d7776cef9d70
  
  This script helps restore deleted dreams for a specific user.
  
  IMPORTANT: This script can only restore dreams if:
  1. Supabase has automatic backups enabled
  2. The dreams were deleted recently (within backup retention period)
  3. You have access to the backup data
  
  If you don't have backups, the deleted dreams cannot be restored.
*/

-- Step 1: Check current status of the user
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
WHERE s.user_id = '4e319154-a316-4367-b8d6-d7776cef9d70'::uuid
GROUP BY s.user_id, s.plan_type, s.updated_at, p.username, p.full_name;

-- Step 2: If you have a backup table, restore from there
-- Uncomment and modify this section if you have a backup table named 'dreams_backup' or similar

/*
-- Example: Restore from a backup table
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
FROM dreams_backup  -- Replace with your backup table name
WHERE user_id = '4e319154-a316-4367-b8d6-d7776cef9d70'::uuid
  AND NOT EXISTS (
    SELECT 1 FROM dreams 
    WHERE dreams.id = dreams_backup.id
  );
*/

-- Step 3: Point-in-time recovery from Supabase backups
-- To restore from Supabase backups:
-- 1. Go to Supabase Dashboard > Database > Backups
-- 2. Find a backup from before the deletion date
-- 3. Use Point-in-time recovery to restore the entire database to that point
-- 4. Extract the dreams data for this user
-- 5. Insert them back into the current database

-- Step 4: Check subscription history to see when plan changed
SELECT 
  user_id,
  plan_type,
  updated_at,
  created_at
FROM subscriptions
WHERE user_id = '4e319154-a316-4367-b8d6-d7776cef9d70'::uuid
ORDER BY updated_at DESC;

-- Note: If you have access to Supabase Dashboard backups:
-- 1. Go to Database > Backups
-- 2. Select a backup from before the deletion
-- 3. Restore that backup to a temporary database
-- 4. Export the dreams for this user
-- 5. Import them back into the main database


