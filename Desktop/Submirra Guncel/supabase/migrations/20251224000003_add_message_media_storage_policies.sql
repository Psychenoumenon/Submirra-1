-- Add storage policies for message media (audio, images, videos)

-- First, ensure the buckets exist (if not already created via dashboard)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('audio-messages', 'audio-messages', true, 10485760, ARRAY['audio/webm', 'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg']),
  ('message-images', 'message-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']),
  ('message-videos', 'message-videos', true, 52428800, ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'])
ON CONFLICT (id) DO UPDATE SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to upload audio messages" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to read audio messages" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own audio messages" ON storage.objects;

DROP POLICY IF EXISTS "Allow authenticated users to upload message images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to read message images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own message images" ON storage.objects;

DROP POLICY IF EXISTS "Allow authenticated users to upload message videos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to read message videos" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own message videos" ON storage.objects;

-- AUDIO MESSAGES POLICIES
-- Allow authenticated users to upload audio messages
CREATE POLICY "Allow authenticated users to upload audio messages"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'audio-messages');

-- Allow public to read audio messages (for playback)
CREATE POLICY "Allow public to read audio messages"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'audio-messages');

-- Allow users to delete their own audio messages
CREATE POLICY "Allow users to delete their own audio messages"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'audio-messages' AND (storage.foldername(name))[1] = auth.uid()::text);

-- MESSAGE IMAGES POLICIES
-- Allow authenticated users to upload message images
CREATE POLICY "Allow authenticated users to upload message images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'message-images');

-- Allow public to read message images
CREATE POLICY "Allow public to read message images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'message-images');

-- Allow users to delete their own message images
CREATE POLICY "Allow users to delete their own message images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'message-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- MESSAGE VIDEOS POLICIES
-- Allow authenticated users to upload message videos
CREATE POLICY "Allow authenticated users to upload message videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'message-videos');

-- Allow public to read message videos
CREATE POLICY "Allow public to read message videos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'message-videos');

-- Allow users to delete their own message videos
CREATE POLICY "Allow users to delete their own message videos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'message-videos' AND (storage.foldername(name))[1] = auth.uid()::text);
