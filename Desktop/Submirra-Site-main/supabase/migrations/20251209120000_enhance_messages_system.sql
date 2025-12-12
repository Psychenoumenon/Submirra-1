-- Add new columns to messages table for multimedia support
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'audio')),
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS audio_url TEXT,
ADD COLUMN IF NOT EXISTS reply_to UUID REFERENCES messages(id) ON DELETE SET NULL;

-- Add online status to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS show_online_status BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create storage bucket for messages if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('messages', 'messages', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload message media" ON storage.objects;
DROP POLICY IF EXISTS "Users can view message media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own message media" ON storage.objects;

-- Create policies for messages bucket
CREATE POLICY "Users can upload message media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'messages' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view message media"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'messages');

CREATE POLICY "Users can delete their own message media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'messages' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(message_type);
CREATE INDEX IF NOT EXISTS idx_profiles_online ON profiles(is_online) WHERE is_online = true;

-- Enable realtime for messages table (ignore error if already added)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE messages;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
