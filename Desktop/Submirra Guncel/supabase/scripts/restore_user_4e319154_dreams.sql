/*
  # Restore Dreams for User: 4e319154-a316-4367-b8d6-d7776cef9d70
  
  IMPORTANT: To restore deleted dreams, you need Supabase backups.
  This script provides queries to help with the restoration process.
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

-- Step 2: Check when the subscription was last updated (when plan might have changed)
SELECT 
  user_id,
  plan_type,
  updated_at,
  created_at,
  trial_end_date
FROM subscriptions
WHERE user_id = '4e319154-a316-4367-b8d6-d7776cef9d70'::uuid;

-- Step 3: Check current dreams count
SELECT COUNT(*) AS current_dreams_count
FROM dreams
WHERE user_id = '4e319154-a316-4367-b8d6-d7776cef9d70'::uuid;

/*
  TO RESTORE DELETED DREAMS:
  
  Option 1: Point-in-Time Recovery (Recommended if available)
  --------------------------------------------
  1. Go to Supabase Dashboard > Database > Backups
  2. Check if Point-in-Time Recovery is enabled
  3. If enabled, restore the database to a point BEFORE the deletion
  4. Export the dreams for this user from the restored database
  5. Insert them back into the current database using the query below
  
  Option 2: Manual Backup Restore
  --------------------------------------------
  1. Go to Supabase Dashboard > Database > Backups
  2. Find a backup from before the deletion date
  3. Download or restore that backup
  4. Extract the dreams data for this user
  5. Use the INSERT query below to restore them
  
  Option 3: If you have a backup table
  --------------------------------------------
  If you created a backup table before deletion, uncomment and modify:
*/

/*
-- Example: Restore from backup table (if exists)
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
WHERE user_id = '4e319154-a316-4367-b8d6-d7776cef9d70'::uuid
  AND NOT EXISTS (
    SELECT 1 FROM dreams 
    WHERE dreams.id = dreams_backup.id
  );
*/


