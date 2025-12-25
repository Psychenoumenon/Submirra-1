/*
  # Restore Dreams from Supabase Backup
  
  IMPORTANT: This script provides instructions for restoring dreams from Supabase backups.
  You need to access Supabase Dashboard > Database > Backups to restore.
  
  Steps to restore:
  1. Go to Supabase Dashboard > Database > Backups
  2. Find a backup from BEFORE the plan change (when dreams existed)
  3. Use Point-in-Time Recovery or restore from that backup
  4. Export the dreams data for user: 4e319154-a316-4367-b8d6-d7776cef9d70
  5. Insert them back into the current database using the query below
*/

-- First, check when the subscription was last updated (when plan might have changed)
SELECT 
  user_id,
  plan_type,
  updated_at,
  created_at,
  trial_end_date
FROM subscriptions
WHERE user_id = '4e319154-a316-4367-b8d6-d7776cef9d70'::uuid;

-- If you have restored dreams from backup, use this query to insert them:
-- (Replace the VALUES with actual dream data from backup)

/*
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
  primary_image_index,
  dream_text_tr,
  dream_text_en,
  analysis_text_tr,
  analysis_text_en,
  created_at
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
  primary_image_index,
  dream_text_tr,
  dream_text_en,
  analysis_text_tr,
  analysis_text_en,
  created_at
FROM dreams_backup  -- Replace with your backup table name
WHERE user_id = '4e319154-a316-4367-b8d6-d7776cef9d70'::uuid
  AND NOT EXISTS (
    SELECT 1 FROM dreams 
    WHERE dreams.id = dreams_backup.id
  );
*/

-- Alternative: If you have a CSV export, you can use Supabase's import feature
-- or use psql COPY command to import the data


