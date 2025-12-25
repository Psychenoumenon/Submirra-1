-- Add media columns to messages table for image and video support

-- Add image_url column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'messages' AND column_name = 'image_url') THEN
        ALTER TABLE messages ADD COLUMN image_url TEXT;
    END IF;
END $$;

-- Add video_url column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'messages' AND column_name = 'video_url') THEN
        ALTER TABLE messages ADD COLUMN video_url TEXT;
    END IF;
END $$;

-- Add audio_url column if it doesn't exist (for voice messages)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'messages' AND column_name = 'audio_url') THEN
        ALTER TABLE messages ADD COLUMN audio_url TEXT;
    END IF;
END $$;

-- Update message_type to support new types if it's an enum
-- If message_type is text, we need to handle it differently
DO $$
BEGIN
    -- Try to alter column to allow new values
    ALTER TABLE messages ALTER COLUMN message_type TYPE TEXT;
EXCEPTION
    WHEN others THEN
        NULL; -- Column is already text, ignore
END $$;
