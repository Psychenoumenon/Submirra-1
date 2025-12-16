/*
  # Create Avatars Storage Bucket and Policies
  
  This migration sets up the storage bucket for user avatars.
  
  IMPORTANT: You must create the storage bucket manually in Supabase Dashboard:
  1. Go to Storage in Supabase Dashboard
  2. Click "New bucket"
  3. Name it: "avatars"
  4. Make it PUBLIC (so avatars can be viewed by anyone)
  5. Click "Create bucket"
  
  After creating the bucket, run this migration to set up the RLS policies.
*/

-- Note: Storage buckets cannot be created via SQL in Supabase
-- They must be created manually in the Dashboard
-- This migration only sets up the RLS policies

-- Storage policies for avatars bucket
-- These policies allow:
-- 1. Anyone to view avatars (public bucket)
-- 2. Authenticated users to upload their own avatars
-- 3. Users to delete their own avatars

-- Policy: Anyone can view avatars (since bucket is public)
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Policy: Authenticated users can upload avatars
DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
CREATE POLICY "Users can upload their own avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  name LIKE (auth.uid()::text || '-%')
);

-- Policy: Users can update their own avatars
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  name LIKE (auth.uid()::text || '-%')
)
WITH CHECK (
  bucket_id = 'avatars' AND
  name LIKE (auth.uid()::text || '-%')
);

-- Policy: Users can delete their own avatars
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
CREATE POLICY "Users can delete their own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  name LIKE (auth.uid()::text || '-%')
);