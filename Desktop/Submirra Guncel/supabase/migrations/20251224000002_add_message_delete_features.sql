/*
  # Message Delete Features
  
  1. conversation_cleared tablosu - Kullanıcı sohbeti sildiğinde o tarihten önceki mesajları görmemesi için
  2. messages tablosuna deleted_for_sender ve deleted_for_receiver kolonları - Benden sil özelliği için
  3. messages tablosuna deleted_for_everyone kolonu - Herkesten sil özelliği için
*/

-- Conversation cleared tablosu - Sohbet silme tarihini tutmak için
CREATE TABLE IF NOT EXISTS conversation_cleared (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  partner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cleared_at timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, partner_id)
);

-- Messages tablosuna silme kolonları ekle
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'deleted_for_sender'
  ) THEN
    ALTER TABLE messages ADD COLUMN deleted_for_sender boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'deleted_for_receiver'
  ) THEN
    ALTER TABLE messages ADD COLUMN deleted_for_receiver boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'deleted_for_everyone'
  ) THEN
    ALTER TABLE messages ADD COLUMN deleted_for_everyone boolean DEFAULT false;
  END IF;
END $$;

-- RLS politikaları
ALTER TABLE conversation_cleared ENABLE ROW LEVEL SECURITY;

-- Kullanıcılar kendi cleared kayıtlarını görebilir
CREATE POLICY "Users can view their own cleared conversations"
  ON conversation_cleared
  FOR SELECT
  USING (auth.uid() = user_id);

-- Kullanıcılar kendi cleared kayıtlarını oluşturabilir
CREATE POLICY "Users can create their own cleared conversations"
  ON conversation_cleared
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Kullanıcılar kendi cleared kayıtlarını güncelleyebilir
CREATE POLICY "Users can update their own cleared conversations"
  ON conversation_cleared
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Kullanıcılar kendi cleared kayıtlarını silebilir
CREATE POLICY "Users can delete their own cleared conversations"
  ON conversation_cleared
  FOR DELETE
  USING (auth.uid() = user_id);

-- Messages tablosu için güncelleme politikası (mesaj silme için)
CREATE POLICY "Users can update their own messages for deletion"
  ON messages
  FOR UPDATE
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_conversation_cleared_user_partner 
  ON conversation_cleared(user_id, partner_id);

CREATE INDEX IF NOT EXISTS idx_messages_deleted 
  ON messages(deleted_for_sender, deleted_for_receiver, deleted_for_everyone);
