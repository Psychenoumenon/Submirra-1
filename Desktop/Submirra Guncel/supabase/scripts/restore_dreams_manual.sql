/*
  # Manually Restore Dreams for User: 4e319154-a316-4367-b8d6-d7776cef9d70
  
  If you have the dream texts and image URLs from Leonardo AI, you can restore them manually.
  
  IMPORTANT: Replace the placeholder values with actual data from Leonardo AI or your records.
*/

-- Example: Restore a single dream with image from Leonardo AI
-- Replace the values with your actual dream data

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
  created_at
)
VALUES (
  gen_random_uuid(),  -- New UUID for the dream
  '4e319154-a316-4367-b8d6-d7776cef9d70'::uuid,  -- Your user ID
  'Your dream text here',  -- Replace with actual dream text
  'Your analysis text here',  -- Replace with actual analysis text
  'https://leonardo-ai-image-url-1.jpg',  -- Replace with Leonardo AI image URL
  'https://leonardo-ai-image-url-2.jpg',  -- Replace with second image URL (if exists)
  'https://leonardo-ai-image-url-3.jpg',  -- Replace with third image URL (if exists)
  'advanced_visual',  -- or 'basic_visual', 'advanced', 'basic' depending on the type
  'completed',
  false,  -- Set to true if you want it public
  NOW()  -- or use the original created_at timestamp if you have it
);
*/

-- If you have multiple dreams, you can insert them all at once:
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
  created_at
)
VALUES 
  (
    gen_random_uuid(),
    '4e319154-a316-4367-b8d6-d7776cef9d70'::uuid,
    'First dream text',
    'First analysis text',
    'https://leonardo-ai-image-url-1.jpg',
    NULL,
    NULL,
    'advanced_visual',
    'completed',
    false,
    NOW()
  ),
  (
    gen_random_uuid(),
    '4e319154-a316-4367-b8d6-d7776cef9d70'::uuid,
    'Second dream text',
    'Second analysis text',
    'https://leonardo-ai-image-url-2.jpg',
    NULL,
    NULL,
    'advanced_visual',
    'completed',
    false,
    NOW()
  );
  -- Add more dreams as needed
*/

-- Check if dreams were successfully restored
SELECT 
  id,
  user_id,
  analysis_type,
  status,
  created_at,
  image_url
FROM dreams
WHERE user_id = '4e319154-a316-4367-b8d6-d7776cef9d70'::uuid
ORDER BY created_at DESC;


