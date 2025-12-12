/*
  # Enhance Messages with Reply and Read Receipts
  
  This migration adds:
  1. reply_to column to messages table for message replies
  2. seen_at column to messages table for read receipts
  3. show_read_receipts column to profiles table for privacy control
  
  1. Changes to messages table
    - Add `reply_to` uuid column (references messages.id)
    - Add `seen_at` timestamptz column (when message was seen)
    
  2. Changes to profiles table
    - Add `show_read_receipts` boolean column (default true)
    
  3. Indexes
    - Index on reply_to for faster lookups
    - Index on seen_at for read receipt queries
*/

-- Add reply_to column to messages table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'reply_to'
  ) THEN
    ALTER TABLE messages ADD COLUMN reply_to uuid REFERENCES messages(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add seen_at column to messages table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'seen_at'
  ) THEN
    ALTER TABLE messages ADD COLUMN seen_at timestamptz;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages(reply_to) WHERE reply_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_seen_at ON messages(receiver_id, seen_at) WHERE seen_at IS NOT NULL;

-- Add show_read_receipts column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'show_read_receipts'
  ) THEN
    ALTER TABLE profiles ADD COLUMN show_read_receipts boolean DEFAULT true NOT NULL;
  END IF;
END $$;

-- Create index for show_read_receipts
CREATE INDEX IF NOT EXISTS idx_profiles_show_read_receipts ON profiles(show_read_receipts) WHERE show_read_receipts = true;

